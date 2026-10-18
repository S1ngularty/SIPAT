import tips from "../../../data/agri-tips.json";

export type AgriTip = {
  id: string;
  title: string;
  description: string;
  category: string;
  crops: string[];
};

const AGRI_TIPS = tips as AgriTip[];

/**
 * One tip per app session.
 *
 * The index is picked once, when this module is first evaluated, so the tip
 * stays stable while the app is open and refreshes on the next launch.
 */
const SESSION_TIP_INDEX = AGRI_TIPS.length
  ? Math.floor(Math.random() * AGRI_TIPS.length)
  : -1;

/** The tip to show this session, or `null` when the list is empty. */
export const getSessionTip = (): AgriTip | null =>
  SESSION_TIP_INDEX >= 0 ? AGRI_TIPS[SESSION_TIP_INDEX] : null;
