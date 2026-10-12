/**
 * Publish this project to GitHub and enable GitHub Pages.
 *
 * There is no git binary in this environment, so the commit is assembled over
 * the GitHub REST API: blobs -> tree -> commit -> ref update. The token is read
 * from the environment (GITHUB_TOKEN) and is never written to disk.
 *
 * Usage:
 *   GITHUB_TOKEN=... node tools/deploy-gh-pages.mjs [owner/repo]
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep, posix } from "node:path";
import { fileURLToPath } from "node:url";

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("GITHUB_TOKEN is not set.");
  process.exit(1);
}

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]+$/, "");
const REPO = process.argv[2] ?? "lizhi-digital-twin";
const [OWNER, NAME] = REPO.includes("/") ? REPO.split("/") : [null, REPO];
const BRANCH = "main";
const API = "https://api.github.com";

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "dist-probe",
  ".verify",
  ".git",
  ".vscode",
  ".idea",
  ".pnpm-store",
]);

/** Dot-paths are skipped, but the CI workflow and the ignore file are real
 *  repository content and must be published. */
const FORCE_INCLUDE = new Set([".github", ".gitignore"]);

async function api(path, { method = "GET", body, allow404 = false } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "lizhi-digital-twin-deploy",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  // an empty repository answers git-data reads with 409 rather than 404
  if (allow404 && (res.status === 404 || res.status === 409)) return null;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const detail = data?.message ?? res.statusText;
    const err = new Error(`${method} ${path} -> ${res.status} ${detail}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith(".") && !FORCE_INCLUDE.has(entry.name)) continue;
      await walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const me = await api("/user");
  const owner = OWNER ?? me.login;
  console.log(`account : ${me.login}`);
  console.log(`target  : ${owner}/${NAME}`);

  // 1. make sure the repository exists
  let repo = await api(`/repos/${owner}/${NAME}`, { allow404: true });
  if (!repo) {
    repo = await api("/user/repos", {
      method: "POST",
      body: {
        name: NAME,
        description: "湖南科技大学立志楼 · 未来智能空间建筑数字孪生面板 (Lizhi Building digital twin console)",
        homepage: `https://${owner}.github.io/${NAME}/`,
        private: false,
        has_issues: true,
        has_wiki: false,
        has_projects: false,
      },
    });
    console.log(`created repository (default branch ${repo.default_branch})`);
  } else {
    console.log("repository exists, updating files");
  }

  // 1b. A brand-new repository has no commits, and the Git Data API refuses to
  //     write blobs into an empty repository. Seed the first commit through the
  //     Contents API, which also creates the branch.
  const branchRef = await api(`/repos/${owner}/${NAME}/git/ref/heads/${BRANCH}`, { allow404: true });
  if (!branchRef) {
    const seed = await readFile(join(ROOT, ".gitignore"));
    await api(`/repos/${owner}/${NAME}/contents/.gitignore`, {
      method: "PUT",
      body: {
        message: "chore: initialise repository",
        content: seed.toString("base64"),
        branch: BRANCH,
      },
    });
    console.log(`initialised ${BRANCH} with a seed commit`);
  }

  // 2. upload every tracked file as a blob
  const files = (await walk(ROOT)).filter((f) =>
    relative(ROOT, f)
      .split(sep)
      .every((part) => !part.startsWith(".") || part === "." || FORCE_INCLUDE.has(part)),
  );
  const tree = [];
  let bytes = 0;
  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join(posix.sep);
    const buf = await readFile(file);
    bytes += buf.length;
    const blob = await api(`/repos/${owner}/${NAME}/git/blobs`, {
      method: "POST",
      body: { content: buf.toString("base64"), encoding: "base64" },
    });
    tree.push({ path: rel, mode: "100644", type: "blob", sha: blob.sha });
    console.log(`  blob ${rel} (${(buf.length / 1024).toFixed(1)} KB)`);
  }
  console.log(`uploaded ${files.length} files, ${(bytes / 1024 / 1024).toFixed(2)} MB total`);

  // 3. commit the tree onto the branch
  const ref = await api(`/repos/${owner}/${NAME}/git/ref/heads/${BRANCH}`, { allow404: true });
  const parentSha = ref?.object?.sha ?? null;
  const parentCommit = parentSha ? await api(`/repos/${owner}/${NAME}/git/commits/${parentSha}`) : null;

  const newTree = await api(`/repos/${owner}/${NAME}/git/trees`, {
    method: "POST",
    body: { tree, ...(parentCommit ? { base_tree: parentCommit.tree.sha } : {}) },
  });

  const message =
    "refine: 极简首页 + 收敛的控制台 / minimal landing and a restrained console\n\n" +
    "Landing is now the building, the name and one choice; the console drops HUD\n" +
    "furniture, gradients, glows and per-panel glass in favour of hairline\n" +
    "structure and a single material system (Apple-style: glass for the control\n" +
    "layer only).";

  const now = Math.floor(Date.now() / 1000);
  const commit = await api(`/repos/${owner}/${NAME}/git/commits`, {
    method: "POST",
    body: {
      message,
      tree: newTree.sha,
      parents: parentSha ? [parentSha] : [],
      author: { name: me.name ?? me.login, email: me.email ?? `${me.login}@users.noreply.github.com`, date: new Date(now * 1000).toISOString() },
      committer: { name: me.name ?? me.login, email: me.email ?? `${me.login}@users.noreply.github.com`, date: new Date(now * 1000).toISOString() },
    },
  });

  if (parentSha) {
    await api(`/repos/${owner}/${NAME}/git/refs/heads/${BRANCH}`, {
      method: "PATCH",
      body: { sha: commit.sha, force: false },
    });
    console.log(`updated ${BRANCH} -> ${commit.sha.slice(0, 8)}`);
  } else {
    // a fresh repository may have no commits on the branch yet
    try {
      await api(`/repos/${owner}/${NAME}/git/refs`, {
        method: "POST",
        body: { ref: `refs/heads/${BRANCH}`, sha: commit.sha },
      });
      console.log(`created ${BRANCH} -> ${commit.sha.slice(0, 8)}`);
    } catch (err) {
      if (err.status === 422) {
        await api(`/repos/${owner}/${NAME}/git/refs/heads/${BRANCH}`, {
          method: "PATCH",
          body: { sha: commit.sha, force: true },
        });
        console.log(`set ${BRANCH} -> ${commit.sha.slice(0, 8)}`);
      } else {
        throw err;
      }
    }
  }

  await api(`/repos/${owner}/${NAME}`, {
    method: "PATCH",
    body: { homepage: `https://${owner}.github.io/${NAME}/` },
  });

  // 4. point GitHub Pages at the Actions workflow. A branch build would publish
  //    the raw source tree, which is not a runnable site, so "workflow" is the
  //    only correct build type here.
  const existing = await api(`/repos/${owner}/${NAME}/pages`, { allow404: true });
  const wantWorkflow = async (method) => {
    await api(`/repos/${owner}/${NAME}/pages`, {
      method,
      body: { build_type: "workflow" },
    });
  };
  try {
    if (existing) await wantWorkflow("PUT");
    else await wantWorkflow("POST");
    const after = await api(`/repos/${owner}/${NAME}/pages`, { allow404: true });
    console.log(`GitHub Pages source: ${after?.build_type ?? "unknown"}`);
  } catch (err) {
    // some accounts reject the combined payload; retry with build_type only
    try {
      if (existing) await wantWorkflow("PUT");
      else await wantWorkflow("POST");
      console.log("GitHub Pages set to GitHub Actions");
    } catch (err2) {
      console.log(`note: could not configure Pages automatically -> ${err2.status} ${err2.message}`);
      console.log("      set Settings -> Pages -> Source to \"GitHub Actions\" manually");
    }
  }

  // 5. report the build state
  let url = `https://${owner}.github.io/${NAME}/`;
  for (let i = 0; i < 12; i++) {
    const info = await api(`/repos/${owner}/${NAME}/pages`, { allow404: true });
    if (info?.html_url) url = info.html_url;
    if (info?.status && info.status !== "building" && info.status !== "queued") {
      console.log(`Pages status: ${info.status}${info.html_url ? ` · ${info.html_url}` : ""}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log("");
  console.log(`repository : https://github.com/${owner}/${NAME}`);
  console.log(`site       : ${url}`);
  console.log(`console    : ${url}#console`);
  console.log("");
  console.log("The workflow in .github/workflows/deploy-pages.yml builds and publishes the");
  console.log("bundle; the first run usually takes 1-3 minutes.");
}

main().catch((err) => {
  console.error(`\nDEPLOY FAILED: ${err.message}`);
  if (err.data) console.error(JSON.stringify(err.data, null, 2).slice(0, 800));
  process.exit(1);
});
