declare module "*.mjs" {
  const value: any;
  export default value;
  export const ACTION_NAMES: string[];
  export const initialState: any;
  export const demoRecipes: any[];
  export function clone(value: any): any;
  export function ageBand(age: number): string;
  export function analyzeClient(client: any): any;
  export function assignRecipeToClient(state: any, recipeId: string, clientId: string, actor?: string): any;
  export function completeAssignedWorkout(state: any, clientId: string, workoutId: string, feedback?: any): any;
  export function createAiApproval(state: any, clientId: string, kind: string): any;
  export function getRecipeById(state: any, recipeId: string): any;
  export function resolveApproval(state: any, approvalId: string, decision: string): any;
  export function toggleRecipeFavorite(state: any, clientId: string, recipeId: string): any;
  export function updateNotification(state: any, notificationId: string, status: string): any;
  export function visibleContentsForClient(state: any, clientId: string, type?: string, now?: Date): any[];
  export function visibleRecipesForClient(state: any, clientId: string, options?: any): any[];
}
