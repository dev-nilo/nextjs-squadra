import { describe, expect, it } from "vitest";
import { ehNavegadorDeApp } from "./instalar";

describe("ehNavegadorDeApp", () => {
  it("spots the browsers inside social apps, which can't install", () => {
    expect(
      ehNavegadorDeApp(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101 (iPhone15,2; iOS 18_1; pt_BR)",
      ),
    ).toBe(true);
    expect(
      ehNavegadorDeApp(
        "Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.39 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/490.0.0.40.108;]",
      ),
    ).toBe(true);
    expect(
      ehNavegadorDeApp(
        "Mozilla/5.0 (Linux; Android 13; moto g54) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36 musical_ly_2023702040 BytedanceWebview/d8a21c6",
      ),
    ).toBe(true);
  });

  it("leaves the phone's own browsers alone", () => {
    expect(
      ehNavegadorDeApp(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
    expect(
      ehNavegadorDeApp(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
    expect(
      ehNavegadorDeApp(
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe(false);
    expect(
      ehNavegadorDeApp(
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36",
      ),
    ).toBe(false);
  });
});
