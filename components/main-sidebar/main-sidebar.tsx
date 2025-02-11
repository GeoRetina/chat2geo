"use client";
import React, { useState } from "react";
import { Tooltip } from "react-tooltip";
import useSidebarButtonStores, {
  Pages,
} from "@/stores/use-sidebar-button-stores";
import {
  IconEdit,
  IconBook,
  IconDatabaseImport,
  IconCirclesRelation,
  IconCircleChevronLeft,
  IconCircleChevronRight,
  IconMessage,
} from "@tabler/icons-react";

import { useButtonsStore } from "@/stores/use-buttons-store";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import AppSettings from "./app-setttings";
import UserProfile from "@/features/user-profile/components/user-profile-modal";
import { resetChatStores } from "@/utils/reset-chat-stores";
import { FeedbackFloating } from "../feedback";

const MainSidebar = () => {
  const setPageToOpen = useSidebarButtonStores((state) => state.setPageToOpen);
  const pageToOpen = useSidebarButtonStores((state) => state.pageToOpen);

  const isSidebarCollapsed = useButtonsStore(
    (state) => state.isSidebarCollapsed
  );
  const toggleSidebarCollapse = useButtonsStore(
    (state) => state.toggleSidebarCollapse
  );

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const router = useRouter();

  function handleOpenPage(page: Pages) {
    setPageToOpen(page);
    if (page === Pages.NewChat) {
      resetChatStores();
    }
    router.push(`/${page}`);
  }

  // Helper to build class names conditionally
  function getButtonClasses(page: Pages, extraClasses?: string) {
    const base =
      `flex items-center gap-4 px-3 py-2 rounded-xl w-full cursor-pointer ${
        isSidebarCollapsed ? "justify-center" : "justify-start"
      } ${extraClasses || ""}`.trim();

    // If this button is for the active page, use "active" styles only:
    if (pageToOpen === page && page !== Pages.NewChat) {
      return `${base} bg-stone-300 text-gray-800`;
    }

    return `${base} text-gray-100 hover:bg-muted dark:hover:bg-muted-foreground/20 hover:text-foreground`;
  }

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-screen bg-[#6C7782] z-[2000] dark:bg-accent ${
          isSidebarCollapsed ? "w-20" : "w-64"
        } flex flex-col shadow-lg transition-all duration-300 ease-in-out overflow-hidden`}
      >
        {/* Navigation Links */}
        <nav className="flex-grow px-4 py-6 space-y-5 pt-14 text-sm font-normal">
          <button
            className={getButtonClasses(Pages.NewChat, "mb-10")}
            data-tooltip-content="Start a new session"
            data-tooltip-id="new-session"
            onClick={() => handleOpenPage(Pages.NewChat)}
          >
            <IconEdit stroke={1.5} className="h-7 w-7 flex-shrink-0" />
            {!isSidebarCollapsed && (
              <span className="whitespace-nowrap">New Session</span>
            )}
          </button>

          <button
            className={getButtonClasses(Pages.ChatHistory)}
            data-tooltip-content="View session history"
            data-tooltip-id="session-history"
            onClick={() => handleOpenPage(Pages.ChatHistory)}
          >
            <IconBook stroke={1.5} className="h-7 w-7 flex-shrink-0" />
            {!isSidebarCollapsed && (
              <span className="whitespace-nowrap">Session History</span>
            )}
          </button>
          <button
            className={getButtonClasses(Pages.KnowledgeBase)}
            data-tooltip-content="Manage knowledge base documents"
            data-tooltip-id="knowledge-base"
            onClick={() => handleOpenPage(Pages.KnowledgeBase)}
          >
            <IconDatabaseImport
              stroke={1.5}
              className="h-7 w-7 flex-shrink-0"
            />
            {!isSidebarCollapsed && (
              <span className="whitespace-nowrap">Knowledge Base</span>
            )}
          </button>

          <button
            className={getButtonClasses(Pages.Integrations)}
            data-tooltip-content="Manage integrations"
            data-tooltip-id="integrations"
            onClick={() => handleOpenPage(Pages.Integrations)}
          >
            <IconCirclesRelation
              stroke={1.5}
              className="h-7 w-7 flex-shrink-0"
            />
            {!isSidebarCollapsed && (
              <span className="whitespace-nowrap">Integrations</span>
            )}
          </button>

          {/* Feedback Button (placed inside nav, using same style) */}
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className={getButtonClasses(Pages.NewChat, "mb-3 translate-y-10")}
            data-tooltip-content="Send feedback"
            data-tooltip-id="feedback"
          >
            <IconMessage stroke={1.5} className="h-7 w-7 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Feedback</span>}
          </button>
        </nav>

        {/* Footer */}
        <UserProfile />
        <AppSettings />

        <Separator className="my-0 bg-gray-200 dark:bg-gray-200" />

        <div
          className="px-4 py-2 pt-1 cursor-pointer text-sm font-normal"
          onClick={toggleSidebarCollapse}
        >
          <div
            className={`flex items-center text-gray-100 px-3 py-2 gap-4 w-full rounded-xl hover:bg-muted dark:hover:bg-muted-foreground/20 hover:text-foreground ${
              isSidebarCollapsed ? "justify-center" : "justify-start"
            }`}
            data-tooltip-content="Toggle sidebar"
            data-tooltip-id="toggle-sidebar"
          >
            <div>
              {isSidebarCollapsed ? (
                <IconCircleChevronRight
                  stroke={1.5}
                  className="h-7 w-7 flex-shrink-0"
                />
              ) : (
                <IconCircleChevronLeft
                  stroke={1.5}
                  className="h-7 w-7 flex-shrink-0"
                />
              )}
            </div>
            {!isSidebarCollapsed && <span>Collapse</span>}
          </div>
        </div>

        {/* Tooltips */}
        <Tooltip
          id="new-session"
          place="right"
          style={{
            backgroundColor: "white",
            color: "black",
            position: "fixed",
            zIndex: 9999,
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            fontWeight: "500",
          }}
          hidden={!isSidebarCollapsed}
        />
        <Tooltip
          id="session-history"
          place="right"
          style={{
            backgroundColor: "white",
            color: "black",
            position: "fixed",
            zIndex: 9999,
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            fontWeight: "500",
          }}
          hidden={!isSidebarCollapsed}
        />
        <Tooltip
          id="build-center"
          place="right"
          style={{
            backgroundColor: "white",
            color: "black",
            position: "fixed",
            zIndex: 9999,
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            fontWeight: "500",
          }}
          hidden={!isSidebarCollapsed}
        />
        <Tooltip
          id="knowledge-base"
          place="right"
          style={{
            backgroundColor: "white",
            color: "black",
            position: "fixed",
            zIndex: 9999,
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            fontWeight: "500",
          }}
          hidden={!isSidebarCollapsed}
        />
        <Tooltip
          id="integrations"
          place="right"
          style={{
            backgroundColor: "white",
            color: "black",
            position: "fixed",
            zIndex: 9999,
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            fontWeight: "500",
          }}
          hidden={!isSidebarCollapsed}
        />
        <Tooltip
          id="feedback"
          place="right"
          style={{
            backgroundColor: "white",
            color: "black",
            position: "fixed",
            zIndex: 9999,
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            fontWeight: "500",
          }}
          hidden={!isSidebarCollapsed}
        />
        <Tooltip
          id="toggle-sidebar"
          place="right"
          style={{
            backgroundColor: "white",
            color: "black",
            position: "fixed",
            zIndex: 9999,
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            fontWeight: "500",
          }}
          hidden={!isSidebarCollapsed}
        />
      </div>
      {/* Feedback Floating Panel */}
      <FeedbackFloating
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </>
  );
};

export default MainSidebar;
