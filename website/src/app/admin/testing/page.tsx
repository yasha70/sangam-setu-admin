import { TestingTools } from "@/components/admin/TestingTools";
import { requireAdmin } from "@/lib/admin";
import { getTestPair } from "@/lib/testing";

export const metadata = { title: "Testing" };

export default async function AdminTesting() {
  await requireAdmin();
  const pair = await getTestPair();
  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Testing</h1>
          <p>Try chat and voice or video calls between your own two devices.</p>
        </div>
      </div>
      <TestingTools pair={pair} />
    </div>
  );
}
