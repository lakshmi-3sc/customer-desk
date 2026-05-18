import test from "node:test";
import assert from "node:assert/strict";
import { getKbPreviewText } from "../lib/kb-preview";
import { is3SCRole, isClientRole } from "../lib/tenant-access";

test("tenant role helpers distinguish internal and client roles", () => {
  assert.equal(is3SCRole("THREESC_ADMIN"), true);
  assert.equal(is3SCRole("THREESC_AGENT"), true);
  assert.equal(is3SCRole("CLIENT_ADMIN"), false);
  assert.equal(is3SCRole(undefined), false);

  assert.equal(isClientRole("CLIENT_ADMIN"), true);
  assert.equal(isClientRole("CLIENT_USER"), true);
  assert.equal(isClientRole("THREESC_LEAD"), false);
  assert.equal(isClientRole(null), false);
});

test("KB preview removes markdown formatting while preserving readable text", () => {
  const preview = getKbPreviewText({
    content: [
      "# Material Shortage",
      "",
      "**Immediate action:** check [alternate suppliers](https://example.com).",
      "- Notify stakeholders",
      "```sql",
      "select * from inventory",
      "```",
      "![chart](chart.png)",
    ].join("\n"),
  });

  assert.equal(
    preview,
    "Material Shortage Immediate action: check alternate suppliers. Notify stakeholders",
  );
});
