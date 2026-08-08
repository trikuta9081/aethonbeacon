/**
 * purchases.ts — RevenueCat SDK wrapper (plumbing only, no purchase UI yet)
 *
 * Status as of this writing: INERT. `react-native-purchases` is not yet a
 * dependency (see ENTITLEMENT_SETUP_CHECKLIST.md -- run
 * `pnpm add react-native-purchases` yourself once you have a RevenueCat
 * account, since the exact current version couldn't be verified from here
 * and a guessed pin would be worse than an honest gap). Every function below
 * no-ops safely if the package isn't installed or the public API keys below
 * aren't set, using the same "configured" boolean pattern as
 * supabaseConfigured / connected guidanceConfigured elsewhere in this codebase.
 *
 * Deliberately no purchase/paywall UI in this file or anywhere else yet --
 * Settings currently promises "no paywall" for the app's first year, and the
 * decision (confirmed 2026-08-07) is to keep this plumbing ready without
 * gating anything until that changes.
 *
 * Identity: logIn() must be called with the exact same normalized user_id as
 * entitlements.ts / supabaseSync.ts's makeUserId (verified phone or email,
 * lowercased, whitespace-stripped) -- otherwise a purchase's app_user_id
 * won't match the row the app is subscribed to, and it will look like the
 * purchase silently vanished. App.tsx's entitlement-subscription effect
 * computes this same entitlementUserId already; call
 * configurePurchasesAndLogIn(entitlementUserId) from that same effect once
 * this module is wired in (not done yet, see checklist).
 */

// react-native-purchases is a native module: dynamic require (not a static
// `import`) so this file can exist safely before the package is installed --
// a static import would break the whole app bundle with an unresolved
// module error the moment this file is imported anywhere.
let PurchasesModule: any = null;
function getPurchasesModule(): any {
  if (PurchasesModule !== null) return PurchasesModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    PurchasesModule = require("react-native-purchases").default;
  } catch {
    PurchasesModule = false; // false = "tried, not installed" (vs null = "haven't tried yet")
  }
  return PurchasesModule;
}

const RC_IOS_PUBLIC_API_KEY = (
  typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY : ""
) ?? "";

const RC_ANDROID_PUBLIC_API_KEY = (
  typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY : ""
) ?? "";

export const purchasesConfigured =
  RC_IOS_PUBLIC_API_KEY.trim().length > 0 || RC_ANDROID_PUBLIC_API_KEY.trim().length > 0;

let configuredOnce = false;

/**
 * Configures the SDK (once per app session) and logs in with the given
 * userId in one call, since in this app the two always happen together --
 * there's no scenario where we'd configure without also knowing who the
 * verified person is. Safe to call multiple times; only the first
 * `configure()` actually does anything, subsequent calls just re-logIn
 * (e.g. if the person re-verifies with a different phone/email).
 */
export async function configurePurchasesAndLogIn(userId: string): Promise<{ ok: boolean; error?: string }> {
  const Purchases = getPurchasesModule();
  if (!Purchases) return { ok: false, error: "react-native-purchases is not installed" };
  if (!purchasesConfigured) return { ok: false, error: "No RevenueCat public API key configured" };
  if (!userId) return { ok: false, error: "userId is required" };

  try {
    const { Platform } = require("react-native");
    const apiKey = Platform.OS === "ios" ? RC_IOS_PUBLIC_API_KEY : RC_ANDROID_PUBLIC_API_KEY;
    if (!apiKey) return { ok: false, error: `No RevenueCat public API key for platform ${Platform.OS}` };

    if (!configuredOnce) {
      Purchases.configure({ apiKey, appUserID: userId });
      configuredOnce = true;
    } else {
      await Purchases.logIn(userId);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "RevenueCat configure/logIn failed" };
  }
}

/**
 * For "restore purchases" buttons -- standard App Store/Play Store
 * requirement for any app with paid content, needed once gating ships even
 * though there's no UI calling this yet.
 */
export async function restorePurchases(): Promise<{ ok: boolean; error?: string }> {
  const Purchases = getPurchasesModule();
  if (!Purchases) return { ok: false, error: "react-native-purchases is not installed" };
  try {
    await Purchases.restorePurchases();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Restore failed" };
  }
}

/**
 * Fetches the current offerings (products/packages configured in the
 * RevenueCat dashboard) for building a paywall UI later. Returns null if
 * unavailable for any reason rather than throwing, since nothing calls this
 * yet and it should never be able to crash a screen that happens to import
 * this module.
 */
export async function fetchCurrentOffering(): Promise<any | null> {
  const Purchases = getPurchasesModule();
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings?.current ?? null;
  } catch {
    return null;
  }
}

/**
 * Purchases a specific package from an offering. Not called from any UI
 * yet -- exists so the eventual paywall screen has a single, already-tested
 * entry point rather than reaching into the RevenueCat SDK directly.
 */
export async function purchasePackage(pkg: any): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  const Purchases = getPurchasesModule();
  if (!Purchases) return { ok: false, error: "react-native-purchases is not installed" };
  try {
    await Purchases.purchasePackage(pkg);
    return { ok: true };
  } catch (error: any) {
    if (error?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: error instanceof Error ? error.message : "Purchase failed" };
  }
}
