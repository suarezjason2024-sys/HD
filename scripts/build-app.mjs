import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const srcRoot = join(root, "src");
const dist = join(root, "dist");
const assets = join(dist, "assets");
const vendor = join(dist, "vendor");

rmSync(dist, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });
mkdirSync(vendor, { recursive: true });

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });

const sourceFiles = walk(srcRoot).filter((file) => [".ts", ".tsx"].includes(extname(file)) && !file.endsWith(".d.ts"));
const toModuleId = (file) => relative(root, file).replace(/\\/g, "/").replace(/\.(tsx|ts)$/, "");
const moduleIds = new Set(sourceFiles.map(toModuleId));

const resolveLocal = (fromId, request) => {
  if (!request.startsWith(".")) return request;
  const base = resolve(root, dirname(fromId), request);
  const candidates = [base, `${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) return request;
  return toModuleId(found);
};

const modules = sourceFiles.map((file) => {
  const id = toModuleId(file);
  const source = readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const rewritten = output.replace(/require\("([^"]+)"\)/g, (_match, request) => {
    if (request.endsWith(".css")) return "require('__style__')";
    return `require("${resolveLocal(id, request)}")`;
  });
  return `"${id}": function(require, module, exports) {\n${rewritten}\n}`;
});

const bundle = `(() => {
  const modules = {
${modules.join(",\n")}
  };
  const cache = {};
  const jsxRuntime = {
    Fragment: React.Fragment,
    jsx(type, props, key) {
      const next = props ? { ...props } : {};
      const children = next.children;
      delete next.children;
      if (key !== undefined) next.key = key;
      return React.createElement(type, next, children);
    },
    jsxs(type, props, key) {
      return jsxRuntime.jsx(type, props, key);
    }
  };
  function require(id) {
    if (id === "react") return React;
    if (id === "react-dom/client") return ReactDOM;
    if (id === "react/jsx-runtime") return jsxRuntime;
    if (id === "__style__") return {};
    if (!modules[id]) throw new Error("Module not found: " + id);
    if (cache[id]) return cache[id].exports;
    const module = { exports: {} };
    cache[id] = module;
    modules[id](require, module, module.exports);
    return module.exports;
  }
  require("src/main");
})();`;

writeFileSync(join(assets, "index.js"), bundle);
cpSync(join(root, "src", "styles.css"), join(assets, "index.css"));
cpSync(join(root, "public"), dist, { recursive: true });
cpSync(join(root, "node_modules", "react", "umd", "react.production.min.js"), join(vendor, "react.production.min.js"));
cpSync(
  join(root, "node_modules", "react-dom", "umd", "react-dom.production.min.js"),
  join(vendor, "react-dom.production.min.js")
);

let html = readFileSync(join(root, "index.html"), "utf8");
html = html
  .replace("</head>", '    <link rel="stylesheet" href="/assets/index.css" />\n  </head>')
  .replace(
    '<script type="module" src="/src/main.tsx"></script>',
    '<script src="/vendor/react.production.min.js"></script>\n    <script src="/vendor/react-dom.production.min.js"></script>\n    <script src="/assets/index.js"></script>'
  );
writeFileSync(join(dist, "index.html"), html);
