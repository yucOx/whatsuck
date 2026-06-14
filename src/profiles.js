'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const PROFILE_ID_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Profile metadata store.
 *
 * Profiles live in a flat JSON array at <userData>/profiles.json.
 * Each profile maps to an Electron partition: `persist:<id>`.
 * The `default` profile uses `session.defaultSession` for backward compat.
 */

function profilesPath() {
  return path.join(app.getPath('userData'), 'profiles.json');
}

const DEFAULT_SEED = Object.freeze([
  { id: 'default', name: 'Personal', isDefault: true, isPinned: false },
]);

function seedDefault() {
  const p = profilesPath();
  fs.writeFileSync(p, JSON.stringify(DEFAULT_SEED, null, 2), 'utf-8');
  return DEFAULT_SEED.map((p) => ({ ...p }));
}

/**
 * Load profiles from disk. If the file is missing, creates one with
 * a default profile. If the file is corrupted, backs it up and
 * re-seeds rather than crashing.
 *
 * @returns {Array<{id: string, name: string, isDefault: boolean, isPinned: boolean}>}
 */
function loadProfiles() {
  const p = profilesPath();
  if (!fs.existsSync(p)) {
    return seedDefault();
  }
  try {
    const text = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('profiles.json is not a non-empty array');
    }
    return parsed;
  } catch (err) {
    // Back up the corrupted file so the user can inspect it later,
    // then re-seed with a working default. This prevents a single
    // bad write from permanently blocking the app.
    const backup = `${p}.broken.${Date.now()}`;
    try {
      fs.renameSync(p, backup);
    } catch {
      // If we can't even rename, just overwrite. Better a working
      // app than a permanent crash loop.
    }
    console.error(
      `[profiles] corrupted, backed up to ${backup}: ${err.message}`
    );
    return seedDefault();
  }
}

/**
 * Save profiles to disk atomically (write .tmp, then rename).
 *
 * @param {Array} profiles - Profile array to persist.
 * @throws {Error} If the write fails.
 */
function saveProfiles(profiles) {
  const p = profilesPath();
  const tmp = p + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(profiles, null, 2), 'utf-8');
    fs.renameSync(tmp, p);
  } catch (err) {
    // Leave the tmp file in place for forensics, but don't let
    // the caller think the save succeeded.
    throw new Error(`Failed to save profiles.json: ${err.message}`);
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Create a new profile with a unique slug id.
 *
 * @param {string} name - Human-readable profile name.
 * @returns {{id: string, name: string, isDefault: boolean, isPinned: boolean}}
 */
function createProfile(name) {
  const profiles = loadProfiles();
  let base = slugify(name);
  if (!base || !PROFILE_ID_RE.test(base)) base = 'profile';
  let id = base;
  let n = 2;
  while (profiles.some((p) => p.id === id)) {
    id = `${base}-${n}`;
    n++;
  }
  const entry = { id, name, isDefault: false, isPinned: false };
  profiles.push(entry);
  saveProfiles(profiles);
  return entry;
}

/**
 * Delete a profile and wipe its partition data from disk.
 *
 * If the deleted profile was the default, promotes the first
 * remaining profile to default. Returns the updated profiles
 * array, or undefined if the profile wasn't found.
 *
 * @param {string} id - Profile id to delete.
 * @returns {Array|undefined}
 */
function deleteProfile(id) {
  let profiles = loadProfiles();
  const target = profiles.find((p) => p.id === id);
  if (!target) return;

  profiles = profiles.filter((p) => p.id !== id);

  if (target.isDefault && profiles.length > 0) {
    profiles[0].isDefault = true;
  }

  saveProfiles(profiles);

  const partitionDir = path.join(app.getPath('userData'), 'Partitions', id);
  if (fs.existsSync(partitionDir)) {
    fs.rmSync(partitionDir, { recursive: true, force: true });
  }

  return profiles;
}

/**
 * Rename a profile's display name. The id (slug) never changes.
 *
 * @param {string} id - Profile id.
 * @param {string} newName - New human-readable name.
 * @returns {object|null} The updated profile, or null if not found.
 */
function renameProfile(id, newName) {
  const profiles = loadProfiles();
  const target = profiles.find((p) => p.id === id);
  if (!target) return null;
  target.name = newName;
  saveProfiles(profiles);
  return target;
}

/**
 * Set a profile as the default (only one can be default).
 *
 * @param {string} id - Profile id to mark as default.
 * @returns {object|undefined} The profile object.
 */
function setDefault(id) {
  const profiles = loadProfiles();
  for (const p of profiles) p.isDefault = p.id === id;
  saveProfiles(profiles);
  return profiles.find((p) => p.id === id);
}

/**
 * Determine which profile to open on this launch.
 *
 * Parses `--profile=<id>` from argv, validates the id against
 * PROFILE_ID_RE, and falls back to the default profile on any
 * invalid or missing input.
 *
 * @param {string[]} [argv] - Process argv array.
 * @returns {string} Profile id to open.
 */
function getActiveProfileId(argv) {
  const match = (argv || process.argv).find((a) => a.startsWith('--profile='));
  if (match) {
    const id = match.split('=')[1];
    if (!PROFILE_ID_RE.test(id)) {
      console.warn(`[profiles] ignoring invalid --profile="${id}"`);
    } else {
      const profiles = loadProfiles();
      if (profiles.some((p) => p.id === id)) return id;
    }
  }
  const profiles = loadProfiles();
  const def = profiles.find((p) => p.isDefault);
  return def ? def.id : 'default';
}

module.exports = {
  loadProfiles,
  saveProfiles,
  createProfile,
  deleteProfile,
  renameProfile,
  setDefault,
  getActiveProfileId,
  PROFILE_ID_RE,
};