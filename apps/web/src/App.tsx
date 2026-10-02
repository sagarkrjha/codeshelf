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
  SnippetListPanel,
  SnippetDetailPanel,
  useSnippetManager,
} from './features/snippets/index';
import { Sidebar, useLayoutState } from './features/layout/index';
import { useSnippetSearch } from './features/search/index';
import { UpdateBanner, UpdateModal, useAppUpdate } from './features/updates/index';
import { GeminiApiKeyModal } from './features/ai/index';
import { getLocalConfig } from './features/storage/storage';
import { FolderConnectBanner, useFileSystemStorage } from './features/storage/index';

export function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isGeminiKeyModalOpen, setIsGeminiKeyModalOpen] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(() => Boolean(getLocalConfig().geminiApiKey));
  const [isFolderBannerDismissed, setIsFolderBannerDismissed] = useState(false);

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
    allUsages,
    activeModalFilterCount,
    filteredSnippets,
    clearFacet,
    clearAllFilters,
  } = useSnippetSearch(snippets);

  const {
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
          accept="on,on.gz,.gz"
          className="hidden"
        />

        {/* Sidebar Navigation */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onCollapse={() => setIsSidebarCollapsed(true)}
          isListCollapsed={isListCollapsed}
          onOpenList={() => setIsListCollapsed(false)}
          toggleList={() => setIsListCollapsed((prev) => !prev)}
          snippets={snippets}
          selectedFacet={selectedFacet}
          onSelectFacet={(facet) => {
            setSelectedFacet(facet);
            setIsListCollapsed(false);
          }}
          allCategories={allCategories}
          categorySubcategories={categorySubcategories}
          expandedCategories={expandedCategories}
          onToggleCategory={toggleCategory}
          allTechnologies={allTechnologies}
          allUsages={allUsages}
          allTags={allTags}
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

        {/* Snippet List Panel */}
        <SnippetListPanel
          isCollapsed={isListCollapsed}
          isSidebarCollapsed={isSidebarCollapsed}
          onExpandSidebar={() => setIsSidebarCollapsed(false)}
          onCollapseList={() => setIsListCollapsed(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          semanticSearchEnabled={semanticSearchEnabled}
          onToggleSemantic={() => setSemanticSearchEnabled(!semanticSearchEnabled)}
          activeModalFilterCount={activeModalFilterCount}
          onOpenFilterModal={() => setIsFilterModalOpen(true)}
          selectedFacet={selectedFacet}
          modalFilter={modalFilter}
          onClearFacet={clearFacet}
          onClearFilterField={(field) =>
            setModalFilter((prev) => ({ ...prev, [field]: undefined }))
          }
          onClearAllFilters={clearAllFilters}
          filteredSnippets={filteredSnippets}
          activeSnippetId={activeSnippet?.id}
          onSelectSnippet={setSelectedId}
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
