import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";
import { API_ROUTE_CONTRACTS, HTTP_METHODS } from "./api-route-contracts";

function exportedMethods(file: string) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const exports = new Set<string>();
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      if (!statement.exportClause) throw new Error(`Declare route exports explicitly in ${file}`);
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          if (!element.isTypeOnly) exports.add(element.name.text);
        }
      }
    }
    if (!ts.canHaveModifiers(statement) || !ts.getModifiers(statement)?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    )) continue;
    if (ts.isFunctionDeclaration(statement) && statement.name) exports.add(statement.name.text);
    if (ts.isVariableStatement(statement)) {
      for (const { name } of statement.declarationList.declarations) {
        if (ts.isIdentifier(name)) exports.add(name.text);
      }
    }
  }
  return HTTP_METHODS.filter((method) => exports.has(method));
}

test("each explicit App Router method has an authorization and input contract", () => {
  const files = readdirSync("app", { recursive: true, encoding: "utf8" }).filter((file) =>
    /(?:^|[/\\])route\.(?:js|jsx|ts|tsx)$/.test(file)
  );
  const discovered = files.flatMap((file) => {
    const path = `/${file.split(sep).slice(0, -1).join("/")}`;
    const methods = exportedMethods(join("app", file));
    expect(methods.length, `No explicit HTTP methods found in app/${file}`).toBeGreaterThan(0);
    return methods.map((method) => `${method} ${path}`);
  });

  const declared = API_ROUTE_CONTRACTS.map(({ method, path, input }) => {
    expect(input.trim(), `${method} ${path} needs an input contract`).not.toBe("");
    return `${method} ${path}`;
  });

  expect(discovered.sort()).toEqual(declared.sort());
});
