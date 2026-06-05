import type {
  MetadataConfigVersionItem,
  PublishedMetadataResponse,
} from "../../types/metadata";

export function MetadataHistoryPanel({
  configVersions,
  discardDraft,
  draft,
  isSubmitting,
  rollbackConfigVersion,
}: {
  configVersions: MetadataConfigVersionItem[];
  discardDraft: () => void | Promise<void>;
  draft: PublishedMetadataResponse | null;
  isSubmitting: boolean;
  rollbackConfigVersion: (configVersionId: string) => void | Promise<void>;
}) {
  return (
    <section className="crm-section metadata-versions-section">
      <div className="section-heading">
        <h3>Versions</h3>
        <span>{configVersions.length}</span>
      </div>
      <div className="record-list">
        {configVersions.map((version) => (
          <div className="record-row" key={version.id}>
            <div>
              <strong>Version {version.versionNumber}</strong>
              {version.notes ? <span>{version.notes}</span> : <span className="muted-copy">No release notes</span>}
            </div>
            <div className="record-meta">
              <span>{version.status}</span>
              <span>{version.publishedAt ? new Date(version.publishedAt).toLocaleDateString() : "unpublished"}</span>
            </div>
            <div className="metadata-row-actions">
              {version.status === "archived" ? (
                <button
                  className="secondary-button compact-button"
                  disabled={isSubmitting || !!draft}
                  onClick={() => void rollbackConfigVersion(version.id)}
                  type="button"
                >
                  Roll Back
                </button>
              ) : null}
              {draft && version.id === draft.configVersion.id ? (
                <button
                  className="secondary-button danger-button compact-button"
                  disabled={isSubmitting}
                  onClick={() => void discardDraft()}
                  type="button"
                >
                  Discard
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {configVersions.length === 0 ? <div className="empty-row">No metadata versions available</div> : null}
        {draft ? <div className="empty-row">Rollback is locked while a draft is open.</div> : null}
      </div>
    </section>
  );
}
