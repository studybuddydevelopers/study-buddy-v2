import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeTestSource } from "./check-test-policy.mjs";

test("detects focused tests across supported test APIs and chains", () => {
  const source = [
    "test.only('one', () => {});",
    "describe.only('two', () => {});",
    "it.concurrent.only('three', () => {});",
    "test.describe.only('four', () => {});",
    "test['only']('five', () => {});",
    "test('six', { only: true }, () => {});",
  ].join("\n");

  const result = analyzeTestSource(source, "sample.test.ts");

  assert.equal(result.focused.length, 6);
  assert.deepEqual(
    result.focused.map((entry) => entry.line),
    [1, 2, 3, 4, 5, 6]
  );
});

test("reports skipped, todo, fixme and expected-failure tests without focusing them", () => {
  const source = [
    "test.skip('one', () => {});",
    "it.todo('two');",
    "test.fixme('three', () => {});",
    "test.fail('four', () => {});",
    "test.skip.each([1])('five', () => {});",
    "test('six', { skip: 'not supported here' }, () => {});",
    "test('seven', { todo: true }, () => {});",
  ].join("\n");

  const result = analyzeTestSource(source, "sample.spec.ts");

  assert.equal(result.focused.length, 0);
  assert.equal(result.reported.length, 7);
});

test("does not treat examples in strings or comments as test declarations", () => {
  const source = [
    "const example = \"test.only('not code')\";",
    "// describe.skip('not code', () => {});",
    "/* it.only('not code', () => {}); */",
    "test('ordinary test', () => {});",
  ].join("\n");

  const result = analyzeTestSource(source, "sample.test.ts");

  assert.deepEqual(result.focused, []);
  assert.deepEqual(result.reported, []);
});

