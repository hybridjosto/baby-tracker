import { bodyEl } from "./config.js";

export const state = {
  activeFeedingGoal: null,
  activeUser: bodyEl.dataset.user || "",
  babyDob: null,
  customEventTypes: [],
  feedIntervalMinutes: null,
  feedSizeBigMl: 150,
  feedSizeMediumMl: 135,
  feedSizeSmallMl: 120,
  userValid: bodyEl.dataset.userValid === "true",
};
