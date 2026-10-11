export function StatusPills({ user, bio }: { user: { status?: string; test?: boolean }; bio: { published?: boolean; verified?: boolean; adminHidden?: boolean } | null }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      {user.test ? <span className="pill gold">Test account</span> : null}
      {user.status === "suspended" ? <span className="pill rose">Suspended</span> : null}
      {bio?.adminHidden ? <span className="pill">Hidden by admin</span> : null}
      {bio?.published ? <span className="pill ok">Published</span> : <span className="pill">Draft</span>}
      {bio?.verified ? <span className="pill peacock">Verified</span> : null}
    </span>
  );
}
