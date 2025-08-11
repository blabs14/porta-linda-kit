import { familyService } from "../features/family/services/family.service";
export { familyService };

export const createFamily = familyService.createFamily;
export const getFamilyData = familyService.getFamilyData;
export const getFamilyMembers = familyService.getMembers;
export const getPendingInvites = familyService.getPendingInvites;

export {
  updateFamilySettings,
  updateMemberRole,
  removeFamilyMember,
  inviteFamilyMember,
  cancelFamilyInvite,
  acceptFamilyInvite,
  shareGoalWithFamily,
  unshareGoalFromFamily,
  getFamilyStatistics,
  getFamilyKPIs,
  getFamilyKPIsRange,
} from "./family.legacy"; 