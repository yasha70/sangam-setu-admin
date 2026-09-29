import type { Metadata } from "next";
import { BiodataEditor } from "@/components/BiodataEditor";
import { requireUser } from "@/lib/auth";
import { getBiodata } from "@/lib/data";

export const metadata: Metadata = { title: "Edit biodata" };

export default async function EditBiodataPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser("/biodata/edit");
  const bio = await getBiodata(user.id);
  const { welcome } = await searchParams;
  return (
    <main className="wrap page">
      <div className="page-head">
        <div>
          <h1>Edit biodata</h1>
          <p>Only your city and state are shown to others. Contact details stay hidden until you accept an interest.</p>
        </div>
      </div>
      {bio ? <BiodataEditor initial={bio} welcome={welcome === "1"} /> : <p className="error">Biodata not found.</p>}
    </main>
  );
}
