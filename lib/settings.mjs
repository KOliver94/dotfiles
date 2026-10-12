// Only the top-level keys present in the repo's settings.json are shared; every other key belongs to the machine.

export function projectShared(local, shared) {
  const out = {};
  for (const key of Object.keys(shared)) {
    if (Object.hasOwn(local, key)) out[key] = local[key];
  }
  return out;
}

export function mergeShared(local, shared) {
  const out = {};
  for (const [key, value] of Object.entries(local)) {
    out[key] = Object.hasOwn(shared, key) ? shared[key] : value;
  }
  for (const [key, value] of Object.entries(shared)) {
    if (!Object.hasOwn(out, key)) out[key] = value;
  }
  return out;
}

export function machineOnlyKeys(local, shared) {
  return Object.keys(local).filter((key) => !Object.hasOwn(shared, key));
}
