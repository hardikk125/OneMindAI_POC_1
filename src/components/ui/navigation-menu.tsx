"use client"

import * as React from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "../../lib/utils"

// =============================================================================
// FOCUS AREAS DATA (Role-specific)
// =============================================================================

interface Prompt {
  id: string;
  title: string;
  template: string;
}

interface FocusArea {
  id: string;
  title: string;
  prompts: Prompt[];
}

interface RoleFocusAreas {
  [role: string]: FocusArea[];
}

const ROLE_FOCUS_AREAS: RoleFocusAreas = {
  "CEO": [
    {
      id: "strategy",
      title: "Strategic Planning",
      prompts: [
        { id: "s1", title: "Growth strategy analysis", template: "As CEO, analyze growth opportunities for [topic]" },
        { id: "s2", title: "Market expansion plan", template: "As CEO, create a market expansion strategy for [region]" },
        { id: "s3", title: "Competitive positioning", template: "As CEO, evaluate our competitive position against [competitor]" },
      ]
    },
    {
      id: "leadership",
      title: "Leadership & Culture",
      prompts: [
        { id: "l1", title: "Leadership development", template: "As CEO, design a leadership development program" },
        { id: "l2", title: "Culture transformation", template: "As CEO, plan a culture transformation initiative" },
        { id: "l3", title: "Succession planning", template: "As CEO, create a succession planning framework" },
      ]
    },
    {
      id: "stakeholder",
      title: "Stakeholder Management",
      prompts: [
        { id: "st1", title: "Board presentation", template: "As CEO, prepare a board presentation on [topic]" },
        { id: "st2", title: "Investor relations", template: "As CEO, draft investor communication for [event]" },
        { id: "st3", title: "Crisis communication", template: "As CEO, develop crisis communication plan" },
      ]
    },
  ],
  "CDIO": [
    {
      id: "digital",
      title: "Digital Transformation",
      prompts: [
        { id: "d1", title: "Digital roadmap", template: "As CDIO, create a digital transformation roadmap" },
        { id: "d2", title: "Technology assessment", template: "As CDIO, assess current technology stack" },
        { id: "d3", title: "Innovation strategy", template: "As CDIO, develop an innovation strategy" },
      ]
    },
    {
      id: "data",
      title: "Data & Analytics",
      prompts: [
        { id: "da1", title: "Data strategy", template: "As CDIO, design a comprehensive data strategy" },
        { id: "da2", title: "AI/ML implementation", template: "As CDIO, plan AI/ML implementation for [use case]" },
        { id: "da3", title: "Analytics platform", template: "As CDIO, architect an enterprise analytics platform" },
      ]
    },
    {
      id: "security",
      title: "Cybersecurity",
      prompts: [
        { id: "sec1", title: "Security assessment", template: "As CDIO, conduct a security posture assessment" },
        { id: "sec2", title: "Zero trust architecture", template: "As CDIO, design zero trust security architecture" },
        { id: "sec3", title: "Incident response", template: "As CDIO, create an incident response plan" },
      ]
    },
  ],
  "Sales": [
    {
      id: "market",
      title: "Market & Opportunity",
      prompts: [
        { id: "m1", title: "Market analysis", template: "As Sales, analyze market opportunities in [region]" },
        { id: "m2", title: "Competitive intelligence", template: "As Sales, gather competitive intelligence on [competitor]" },
        { id: "m3", title: "Target account strategy", template: "As Sales, develop target account strategy" },
      ]
    },
    {
      id: "prebid",
      title: "Pre-Bid Phase",
      prompts: [
        { id: "pb1", title: "Qualification criteria", template: "As Sales, define deal qualification criteria" },
        { id: "pb2", title: "Stakeholder mapping", template: "As Sales, map stakeholders for [opportunity]" },
        { id: "pb3", title: "Value proposition", template: "As Sales, craft value proposition for [customer]" },
      ]
    },
    {
      id: "bid",
      title: "Bid Phase",
      prompts: [
        { id: "b1", title: "Proposal strategy", template: "As Sales, develop proposal strategy for [RFP]" },
        { id: "b2", title: "Pricing strategy", template: "As Sales, create pricing strategy for [deal]" },
        { id: "b3", title: "Win themes", template: "As Sales, identify win themes for [opportunity]" },
      ]
    },
    {
      id: "negotiation",
      title: "Negotiation & Closing",
      prompts: [
        { id: "n1", title: "Negotiation tactics", template: "Provide negotiation tactics to close pending deals" },
        { id: "n2", title: "Legal compliance", template: "Ensure legal compliance in contract negotiations" },
        { id: "n3", title: "Deal closure tips", template: "Give tips for successful deal closures" },
      ]
    },
  ],
};

// =============================================================================
// BASE NAVIGATION MENU COMPONENTS
// =============================================================================

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center space-x-1",
      className
    )}
    {...props}
  />
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
)

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}{" "}
    <ChevronRightIcon
      className="relative top-[1px] ml-2 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-90"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "absolute left-full top-0 w-[320px] border rounded-md p-4 bg-background shadow-lg",
      "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52",
      className
    )}
    {...props}
  />
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
))
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName

// =============================================================================
// 3-STEP WIZARD NAVIGATION MENU
// =============================================================================

interface WizardNavigationMenuProps {
  onPromptSelect?: (prompt: Prompt, role: string, focusArea: FocusArea) => void;
  className?: string;
}

function WizardNavigationMenu({ onPromptSelect, className }: WizardNavigationMenuProps) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const [selectedFocusArea, setSelectedFocusArea] = React.useState<FocusArea | null>(null);

  const roles = ["CEO", "CDIO", "Sales"];

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleFocusAreaSelect = (area: FocusArea) => {
    setSelectedFocusArea(area);
    setStep(3);
  };

  const handlePromptSelect = (prompt: Prompt) => {
    if (onPromptSelect && selectedRole && selectedFocusArea) {
      onPromptSelect(prompt, selectedRole, selectedFocusArea);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedRole(null);
    } else if (step === 3) {
      setStep(2);
      setSelectedFocusArea(null);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedRole(null);
    setSelectedFocusArea(null);
  };

  const focusAreas = selectedRole ? ROLE_FOCUS_AREAS[selectedRole] || [] : [];

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="mb-6 p-6 bg-white rounded-xl border shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Who are you, and what do you want to do today?
        </h2>
        <p className="text-sm text-gray-600">
          Start by choosing the role you are operating in right now, OneMind will shape
          recommendations, language and actions to match your context.
        </p>
      </div>

      {/* Wizard Steps */}
      <div className="flex items-start gap-4">
        {/* Step 1: Your Role */}
        <div className="flex-1">
          <div className="p-4 bg-white rounded-xl border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Your role</h3>
              {step > 1 && (
                <button
                  onClick={handleReset}
                  className="text-xs text-purple-600 hover:text-purple-800"
                >
                  Change
                </button>
              )}
            </div>
            
            {step === 1 ? (
              <div className="space-y-2">
                {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSelect(role)}
                    className="flex items-center justify-between w-full px-4 py-3 text-left text-sm font-medium rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                  >
                    <span>{role}</span>
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 bg-purple-50 rounded-lg border border-purple-200">
                <span className="font-medium text-purple-900">{selectedRole}</span>
              </div>
            )}
          </div>

          {/* Connector Arrow */}
          {step >= 1 && (
            <div className="flex justify-center my-2">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          )}

          {/* Sub-roles hint */}
          {step === 1 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border">
              <p className="text-xs font-medium text-gray-500 mb-2">Head role</p>
              <div className="space-y-1">
                <p className="text-sm text-gray-700">CEO</p>
                <p className="text-sm text-gray-700">Head Of Sales</p>
              </div>
            </div>
          )}
        </div>

        {/* Arrow between columns */}
        {step >= 2 && (
          <div className="flex items-center pt-16">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        )}

        {/* Step 2: Focus Areas */}
        {step >= 2 && (
          <div className="flex-1">
            <div className="p-4 bg-white rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Focus Areas</h3>
                {step > 2 && (
                  <button
                    onClick={handleBack}
                    className="text-xs text-purple-600 hover:text-purple-800"
                  >
                    Change
                  </button>
                )}
              </div>
              
              {step === 2 ? (
                <div className="space-y-2">
                  {focusAreas.map((area) => (
                    <button
                      key={area.id}
                      onClick={() => handleFocusAreaSelect(area)}
                      className="flex items-center justify-between w-full px-4 py-3 text-left text-sm font-medium rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      <span>{area.title}</span>
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="font-medium text-purple-900">{selectedFocusArea?.title}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Arrow between columns */}
        {step >= 3 && (
          <div className="flex items-center pt-16">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        )}

        {/* Step 3: Prompts */}
        {step >= 3 && selectedFocusArea && (
          <div className="flex-1">
            <div className="p-4 bg-white rounded-xl border shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Prompts</h3>
              
              <div className="space-y-3">
                {selectedFocusArea.prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handlePromptSelect(prompt)}
                    className="block w-full text-left p-3 text-sm text-gray-700 hover:bg-purple-50 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors"
                  >
                    {prompt.title}
                  </button>
                ))}
              </div>

              <button
                className="mt-4 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  WizardNavigationMenu,
  ROLE_FOCUS_AREAS,
}

export type { Prompt, FocusArea, RoleFocusAreas, WizardNavigationMenuProps }
