export const ARCHIVE_DELETE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
export const ARCHIVE_SWEEP_BATCH = 40;

export function isDueForArchiveDelete(args: { archivedAt: Date | null; now: Date }): boolean {
  if (!args.archivedAt) return false;
  return args.now.getTime() - args.archivedAt.getTime() >= ARCHIVE_DELETE_AFTER_MS;
}
