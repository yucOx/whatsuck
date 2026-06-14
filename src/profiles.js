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

function loadProfiles() {
  const p = profilesPath();
  if (!fs.existsSync(p)) {
    const seed = [{ id: 'default', name: 'Personal', isDefault: true, isPinned: false }];
    fs.writeFileSync(p, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function saveProfiles(profiles) {
  const p = profilesPath();
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(profiles, null, 2), 'utf-8');
  fs.renameSync(tmp, p);
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function createProfile(name) {
  const profiles = loadProfiles();
  let base = slugify(name);
  if (!base || !PROFILE_ID_RE.test(base)) base = 'profile';
  let id = base;
  let n = 2;
  while (profiles.some(p => p.id === id)) {
    id = `${base}-${n}`;
    n++;
  }
  const entry = { id, name, isDefault: false, isPinned: false };
  profiles.push(entry);
  saveProfiles(profiles);
  return entry;
}

function deleteProfile(id) {
  let profiles = loadProfiles();
  const target = profiles.find(p => p.id === id);
  if (!target) return;

  // Remove from list.
  profiles = profiles.filter(p => p.id !== id);

  // If we deleted the default, promote the first remaining.
  if (target.isDefault && profiles.length > 0) {
    profiles[0].isDefault = true;
  }

  saveProfiles(profiles);

  // Wipe the partition data directory.
  const partitionDir = path.join(app.getPath('userData'), 'Partitions', id);
  if (fs.existsSync(partitionDir)) {
    fs.rmSync(partitionDir, { recursive: true, force: true });
  }

  return profiles;
}

function renameProfile(id, newName) {
  const profiles = loadProfiles();
  const target = profiles.find(p => p.id === id);
  if (!target) return null;
  target.name = newName;
  saveProfiles(profiles);
  return target;
}

function setDefault(id) {
  const profiles = loadProfiles();
  for (const p of profiles) p.isDefault = p.id === id;
  saveProfiles(profiles);
  return profiles.find(p => p.id === id);
}

function getActiveProfileId(argv) {
  const match = (argv || process.argv).find(a => a.startsWith('--profile='));
  if (match) {
    const id = match.split('=')[1];
    const profiles = loadProfiles();
    if (profiles.some(p => p.id === id)) return id;
  }
  // Fall back to the profile marked isDefault.
  const profiles = loadProfiles();
  const def = profiles.find(p => p.isDefault);
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