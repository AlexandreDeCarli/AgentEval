import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '../utils/fileStorage';

interface OnboardingState {
    hasCompletedOnboarding: boolean;
    setHasCompletedOnboarding: (val: boolean) => void;
    hasCompletedProjectOnboarding: boolean;
    setHasCompletedProjectOnboarding: (val: boolean) => void;
    hasCompletedMissionOnboarding: boolean;
    setHasCompletedMissionOnboarding: (val: boolean) => void;
    showHelpMenu: boolean;
    setShowHelpMenu: (val: boolean) => void;
    hasCompletedWelcomeModal: boolean;
    setHasCompletedWelcomeModal: (val: boolean) => void;
    showWelcomeModal: boolean;
    setShowWelcomeModal: (val: boolean) => void;
    tourTriggerCount: number;
    triggerTour: () => void;
    projectTourTriggerCount: number;
    triggerProjectTour: () => void;
    missionTourTriggerCount: number;
    triggerMissionTour: () => void;
    isHydrated: boolean;
    setIsHydrated: (val: boolean) => void;
    dashboardTourCurrentStep: number;
    setDashboardTourCurrentStep: (step: number) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set) => ({
            hasCompletedOnboarding: false,
            setHasCompletedOnboarding: (val) => set({ hasCompletedOnboarding: val }),
            hasCompletedProjectOnboarding: false,
            setHasCompletedProjectOnboarding: (val) => set({ hasCompletedProjectOnboarding: val }),
            hasCompletedMissionOnboarding: false,
            setHasCompletedMissionOnboarding: (val) => set({ hasCompletedMissionOnboarding: val }),
            showHelpMenu: false,
            setShowHelpMenu: (val) => set({ showHelpMenu: val }),
            hasCompletedWelcomeModal: false,
            setHasCompletedWelcomeModal: (val) => set({ hasCompletedWelcomeModal: val }),
            showWelcomeModal: false,
            setShowWelcomeModal: (val) => set({ showWelcomeModal: val }),
            tourTriggerCount: 0,
            triggerTour: () => set((state) => ({ tourTriggerCount: state.tourTriggerCount + 1 })),
            projectTourTriggerCount: 0,
            triggerProjectTour: () => set((state) => ({ projectTourTriggerCount: state.projectTourTriggerCount + 1 })),
            missionTourTriggerCount: 0,
            triggerMissionTour: () => set((state) => ({ missionTourTriggerCount: state.missionTourTriggerCount + 1 })),
            isHydrated: false,
            setIsHydrated: (val) => set({ isHydrated: val }),
            dashboardTourCurrentStep: 0,
            setDashboardTourCurrentStep: (step) => set({ dashboardTourCurrentStep: step }),
        }),
        {
            name: 'agent-qa-onboarding',
            storage: createJSONStorage(() => fileStorage),
            partialize: (state) => ({
                hasCompletedOnboarding: state.hasCompletedOnboarding,
                hasCompletedProjectOnboarding: state.hasCompletedProjectOnboarding,
                hasCompletedMissionOnboarding: state.hasCompletedMissionOnboarding,
                hasCompletedWelcomeModal: state.hasCompletedWelcomeModal,
                dashboardTourCurrentStep: state.dashboardTourCurrentStep,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setIsHydrated(true);
            }
        }
    )
);
