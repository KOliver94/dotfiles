// repo, target and base are content hashes: the repo file, the machine file (null when missing) and what the last deploy or capture left (null when unknown).
export function decide({ repo, target, base }) {
  if (target === null) return "missing";
  if (repo === target) return "in-sync";
  if (base !== null && target === base) return "repo-ahead";
  if (base !== null && repo === base) return "machine-edit";
  return "conflict";
}
