import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { findRelatedSnippets } from '@codeshelf/shared';
import {
  exportGitSyncManifest,
  exportAllSnippetsAsJson,
  exportAllSnippetsAsCompressedJson,
} from './features/export-import/index';
import {
  SnippetModal,
  VersionHistoryModal,
  FilterModal,
  SnippetDetailPanel,
  useSnippetManager,
} from './features/snippets/index';
import { Sidebar, useLayoutState } from './features/layout/index';
import { useSnippetSearch } from './features/search/index';
import { UpdateBanner, UpdateModal, useAppUpdate } from './features/updates/index';
import { GeminiApiKeyModal } from './features/ai/index';
import { getLocalConfig, saveLocalConfig, subscribeToConfigChanges } from './features/storage/storage';
import { FolderConnectBanner, useFileSystemStorage } from './features/storage/index';
import { useEffect, useCallback } from 'react';

export function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isGeminiKeyModalOpen, setIsGeminiKeyModalOpen] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(() => Boolean(getLocalConfig().geminiApiKey));
  const [isFolderBannerDismissed, setIsFolderBannerDismissed] = useState(false);
  const [localConfig, setLocalConfig] = useState(() => getLocalConfig());

  useEffect(() => {
    const unsub = subscribeToConfigChanges((cfg) => {
      setHasGeminiKey(Boolean(cfg.geminiApiKey));
      setLocalConfig(cfg);
    });
    return unsub;
  }, []);

  const handleAddFolder = useCallback((folderName: string) => {
    const current = localConfig.customCategories || [];
    if (!current.includes(folderName)) {
      const updated = [...current, folderName];
      saveLocalConfig({ customCategories: updated });
    }
  }, [localConfig]);

  const handleDeleteFolder = useCallback((folderName: string) => {
    const current = localConfig.customCategories || [];
    const updated = current.filter((c) => c !== folderName);
    saveLocalConfig({ customCategories: updated });
  }, [localConfig]);

  const handleAddTag = useCallback((tagName: string) => {
    const current = localConfig.customTags || [];
    if (!current.includes(tagName)) {
      const updated = [...current, tagName];
      saveLocalConfig({ customTags: updated });
    }
  }, [localConfig]);

  const handleDeleteTag = useCallback((tagName: string) => {
    const current = localConfig.customTags || [];
    const updated = current.filter((t) => t !== tagName);
    saveLocalConfig({ customTags: updated });
  }, [localConfig]);

  // File System Access API — tracks connection to ~/.codeshelf on the user's device
  const {
    isSupported: isFsSupported,
    status: fsStatus,
    dirName: fsDirName,
    isLoading: isFsLoading,
    isExpectedDir: isFsExpectedDir,
    connect: connectFolder,
    requestPermission: requestFsPermission,
  } = useFileSystemStorage();


  // Feature hooks separating business logic and state
  const {
    snippets,
    selectedId,
    setSelectedId,
    editingSnippet,
    isModalOpen,
    isHistoryOpen,
    setIsHistoryOpen,
    copied,
    copiedMarkdown,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleDelete,
    handleSaveSnippet,
    handleRevertRevision,
    handleAutofillActiveSnippet,
    handleCopyCode,
    handleCopyCodeAsMarkdown,
    handleImportMarkdown,
    handleRestoreBackup,
  } = useSnippetManager();

  const {
    searchQuery,
    setSearchQuery,
    semanticSearchEnabled,
    setSemanticSearchEnabled,
    sortOption,
    setSortOption,
    selectedFacet,
    setSelectedFacet,
    isFilterModalOpen,
    setIsFilterModalOpen,
    modalFilter,
    setModalFilter,
    allTags,
    allCategories,
    categorySubcategories,
    allTechnologies,
    activeModalFilterCount,
    filteredSnippets,
    clearFacet,
    clearAllFilters,
  } = useSnippetSearch(snippets);

  const {
    activeActivityTab,
    setActiveActivityTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isListCollapsed,
    setIsListCollapsed,
    expandedCategories,
    toggleCategory,
  } = useLayoutState();

  const {
    updateInfo,
    isCheckingUpdate,
    isBannerDismissed,
    setIsBannerDismissed,
    appVersion,
    isUpdateModalOpen,
    setIsUpdateModalOpen,
    handleCheckForUpdates,
  } = useAppUpdate();

  // Active snippet resolution
  const activeSnippet = useMemo(() => {
    if (selectedId) {
      const found = filteredSnippets.find((s) => s.id === selectedId);
      if (found) return found;
    }
    return filteredSnippets[0] || null;
  }, [selectedId, filteredSnippets]);

  // Related knowledge recommendations
  const relatedSnippets = useMemo(() => {
    if (!activeSnippet) return [];
    return findRelatedSnippets(activeSnippet, snippets, 3);
  }, [activeSnippet, snippets]);

  const onFileUploadChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImportMarkdown(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onJsonUploadChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleRestoreBackup(file);
    }
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary text-text-main font-sans">
      {/* Update Notification Banner */}
      {updateInfo?.hasUpdate && !isBannerDismissed && (
        <UpdateBanner
          updateInfo={updateInfo}
          appVersion={appVersion}
          onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
          onDismiss={() => setIsBannerDismissed(true)}
        />
      )}

      {/* File System Folder Connect Banner — web only, not shown in Electron */}
      {isFsSupported && !window.codeshelfApi && !isFolderBannerDismissed && (
        <FolderConnectBanner
          status={fsStatus}
          dirName={fsDirName}
          isExpectedDir={isFsExpectedDir}
          isLoading={isFsLoading}
          onConnect={connectFolder}
          onRequestPermission={requestFsPermission}
          onDismiss={() => setIsFolderBannerDismissed(true)}
        />
      )}

      {/* Main Workspace Panels */}
      <div className="flex flex-1 h-auto w-full overflow-hidden">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileUploadChange}
          accept=".md,.markdown"
          className="hidden"
        />
        <input
          type="file"
          ref={jsonInputRef}
          onChange={onJsonUploadChange}
          accept=".json,.json.gz,.gz"
          className="hidden"
        />

        {/* Unified VS Code Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onCollapse={() => setIsSidebarCollapsed(true)}
          activeTab={activeActivityTab}
          onTabChange={(tab) => {
            setActiveActivityTab(tab);
            setIsSidebarCollapsed(false);
          }}
          snippets={snippets}
          selectedFacet={selectedFacet}
          onSelectFacet={(facet) => {
            setSelectedFacet(facet);
          }}
          allCategories={allCategories}
          categorySubcategories={categorySubcategories}
          expandedCategories={expandedCategories}
          onToggleCategory={toggleCategory}
          allTechnologies={allTechnologies}
          allTags={allTags}
          customCategories={localConfig.customCategories || []}
          customTags={localConfig.customTags || []}
          onAddFolder={handleAddFolder}
          onDeleteFolder={handleDeleteFolder}
          onAddTag={handleAddTag}
          onDeleteTag={handleDeleteTag}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          semanticSearchEnabled={semanticSearchEnabled}
          onToggleSemantic={() => setSemanticSearchEnabled(!semanticSearchEnabled)}
          activeModalFilterCount={activeModalFilterCount}
          onOpenFilterModal={() => setIsFilterModalOpen(true)}
          modalFilter={modalFilter}
          onClearFacet={clearFacet}
          onClearFilterField={(field) =>
            setModalFilter((prev) => ({ ...prev, [field]: undefined }))
          }
          onClearAllFilters={clearAllFilters}
          filteredSnippets={filteredSnippets}
          activeSnippetId={activeSnippet?.id}
          onSelectSnippet={setSelectedId}
          onNewSnippet={handleOpenCreate}
          onImportMarkdown={() => fileInputRef.current?.click()}
          onExportGitSync={() => exportGitSyncManifest(snippets)}
          onRestoreBackup={() => jsonInputRef.current?.click()}
          onExportBackup={() => exportAllSnippetsAsJson(snippets)}
          onExportCompressedBackup={() => exportAllSnippetsAsCompressedJson(snippets)}
          appVersion={appVersion}
          updateInfo={updateInfo}
          onOpenUpdates={() => {
            setIsUpdateModalOpen(true);
            if (!updateInfo) {
              handleCheckForUpdates();
            }
          }}
          onOpenGeminiKey={() => setIsGeminiKeyModalOpen(true)}
          hasGeminiKey={hasGeminiKey}
        />

        {/* Snippet Detail Panel */}
        <SnippetDetailPanel
          activeSnippet={activeSnippet}
          isSidebarCollapsed={isSidebarCollapsed}
          isListCollapsed={isListCollapsed}
          onExpandSidebar={() => setIsSidebarCollapsed(false)}
          onToggleList={() => setIsListCollapsed(!isListCollapsed)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onAutofill={() => handleAutofillActiveSnippet(activeSnippet)}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          onCopyCode={handleCopyCode}
          onCopyCodeAsMarkdown={handleCopyCodeAsMarkdown}
          copied={copied}
          copiedMarkdown={copiedMarkdown}
          relatedSnippets={relatedSnippets}
          onSelectSnippet={setSelectedId}
          onSelectTagFacet={(tag) => setSelectedFacet({ type: 'tag', value: tag })}
        />
      </div>

      {/* Modals */}
      <SnippetModal
        isOpen={isModalOpen}
        snippet={editingSnippet}
        snippets={snippets}
        initialCategory={
          selectedFacet.type === 'folder' || selectedFacet.type === 'domain'
            ? selectedFacet.value
            : undefined
        }
        onClose={handleCloseModal}
        onSave={handleSaveSnippet}
      />

      <FilterModal
        isOpen={isFilterModalOpen}
        snippets={snippets}
        activeFilter={modalFilter}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setModalFilter}
        onReset={() => setModalFilter({})}
      />

      <VersionHistoryModal
        isOpen={isHistoryOpen}
        snippet={activeSnippet}
        onClose={() => setIsHistoryOpen(false)}
        onRevert={(v) => handleRevertRevision(activeSnippet, v)}
      />

      <UpdateModal
        isOpen={isUpdateModalOpen}
        updateInfo={updateInfo}
        isChecking={isCheckingUpdate}
        onClose={() => setIsUpdateModalOpen(false)}
        onCheckAgain={handleCheckForUpdates}
      />

      <GeminiApiKeyModal
        isOpen={isGeminiKeyModalOpen}
        onClose={() => setIsGeminiKeyModalOpen(false)}
        onSaved={() => setHasGeminiKey(Boolean(getLocalConfig().geminiApiKey))}
      />
    </div>
  );
}
