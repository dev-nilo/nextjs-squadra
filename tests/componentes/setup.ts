import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Each test starts on an empty page, with no mock left from the last one.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
