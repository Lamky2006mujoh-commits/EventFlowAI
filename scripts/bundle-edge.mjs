import { rolldown } from "rolldown";
import {
  mkdir,
  copyFile,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
for (const name of ["workspace", "planning"]) {
  await mkdir(root + "dist-edge/" + name, { recursive: true });
  const bundle = await rolldown({
    input: root + "supabase/functions/" + name + "/index.ts",
    external: ["zod", "@supabase/supabase-js"],
    platform: "neutral",
  });
  try {
    await bundle.write({
      file: root + "dist-edge/" + name + "/index.ts",
      format: "esm",
      paths: {
        zod: "npm:zod@4.6.7",
        "@supabase/supabase-js": "npm:@supabase/supabase-js@2.118.0",
      },
    });
  } finally {
    await bundle.close();
  }
  const code = await readFile(root + "dist-edge/" + name + "/index.ts", "utf8");
  if (/from ["']\.\.?\//.test(code))
    throw new Error("Unbundled relative import in " + name);
}
await mkdir(root + "dist-edge/migrations", { recursive: true });
const migrations = (await readdir(root + "supabase/migrations"))
  .filter((p) => p.endsWith(".sql"))
  .sort();
const parts = [];
for (const name of migrations) {
  await copyFile(
    root + "supabase/migrations/" + name,
    root + "dist-edge/migrations/" + name,
  );
  parts.push(
    "-- " +
      name +
      "\n" +
      (await readFile(root + "supabase/migrations/" + name, "utf8")),
  );
}
const ledgerRows = migrations.map((file) => {
  const separator = file.indexOf("_");
  const version = file.slice(0, separator),
    name = file.slice(separator + 1, -4);
  return "('" + version + "','" + name + "',array[]::text[])";
});
const ledger =
  [
    "create schema if not exists supabase_migrations;",
    "create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text);",
    "alter table supabase_migrations.schema_migrations enable row level security;",
    "revoke all on supabase_migrations.schema_migrations from anon, authenticated;",
    "insert into supabase_migrations.schema_migrations(version,name,statements) values",
    ledgerRows.join(",\n"),
    "on conflict(version) do nothing;",
  ].join("\n") + "\n";
await writeFile(
  root + "dist-edge/record-migrations.sql",
  "begin;\n" + ledger + "commit;\n",
);
await writeFile(
  root + "dist-edge/bootstrap-new-project.sql",
  "-- Fresh projects only. Apply once. All changes are atomic.\nbegin;\n" +
    parts.join("\n\n") +
    "\n" +
    ledger +
    "\ncommit;\n",
);
await copyFile(
  root + "supabase/migrations/20261104040000_sprint3_planning.sql",
  root + "dist-edge/sprint3-planning.sql",
);
console.log(
  "Ready: bundled workspace/planning functions, individual migrations and atomic new-project bootstrap.",
);
