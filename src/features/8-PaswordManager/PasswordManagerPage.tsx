import React, { useState, useMemo } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import {
  HeaderAndTab,
  PasswordStats,
  SearchAndFilter,
  PasswordList,
  AddPasswordDialog,
  CategoryFilter,
  PasswordSidebarFooter,
  PasswordListFooter
} from './section';
import { Password, PasswordFormData, Category } from './types';
import { getPasswordStrength } from './section/PasswordStrengthMeter';
import { Button } from '@/features/ui/button';
import { useToast, usePasswords } from './hooks';
import { Skeleton } from '@/features/ui/skeleton';

const PasswordManagerPage: React.FC = () => {
  const { toast } = useToast();
  const {
    passwords,
    categories,
    loading,
    addPassword,
    updatePassword,
    deletePassword,
    toggleFavorite,
  } = usePasswords();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isShowingFavorites, setIsShowingFavorites] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [activeTab, setActiveTab] = useState('vault');

  // Update category counts
  const categoriesWithCounts = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      count: passwords.filter((p) => p.category === cat.id).length,
    }));
  }, [passwords, categories]);

  // Filter passwords
  const filteredPasswords = useMemo(() => {
    let filtered = passwords;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.url?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by favorites
    if (isShowingFavorites) {
      filtered = filtered.filter((p) => p.isFavorite);
    }

    // Filter by category
    if (selectedCategory !== 'all' && !isShowingFavorites) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    return filtered;
  }, [passwords, searchQuery, selectedCategory, isShowingFavorites]);

  // Calculate stats
  const stats = useMemo(() => {
    const strongCount = passwords.filter((p) => getPasswordStrength(p.password) === 'strong').length;
    const weakCount = passwords.filter((p) => getPasswordStrength(p.password) === 'weak').length;
    const favoriteCount = passwords.filter((p) => p.isFavorite).length;

    return {
      total: passwords.length,
      strong: strongCount,
      weak: weakCount,
      favorites: favoriteCount,
    };
  }, [passwords]);

  const handleAddPassword = () => {
    setEditingPassword(null);
    setDialogOpen(true);
  };

  const handleEditPassword = (password: Password) => {
    setEditingPassword(password);
    setDialogOpen(true);
  };

  const handleSavePassword = async (data: PasswordFormData) => {
    if (editingPassword) {
      await updatePassword(editingPassword.id, data);
    } else {
      await addPassword(data);
    }
    setDialogOpen(false);
  };

  const handleDeletePassword = async (id: string) => {
    if (confirm('Are you sure you want to delete this password?')) {
      await deletePassword(id);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    await toggleFavorite(id);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsShowingFavorites(false);
  };

  const handleShowFavorites = () => {
    setIsShowingFavorites(true);
    setSelectedCategory('all');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };


  if (loading) {
    return (
      <StandardLayout>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col overflow-hidden">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Stats */}
              <div className="flex-shrink-0 mb-1">
                <PasswordStats
                  totalPasswords={stats.total}
                  strongPasswords={stats.strong}
                  weakPasswords={stats.weak}
                  favorites={stats.favorites}
                />
              </div>

              {/* Main Content Area - Grid Layout */}
              <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                {/* Left Column - Filters - 3 columns */}
                <div className="col-span-3 h-full">
                  <div className="bg-white border rounded-lg shadow-sm h-full flex flex-col max-h-[calc(100vh-180px)]">
                    {/* Sidebar Header */}
                    <div className="px-4 py-1.5 border-b flex-shrink-0">
                      <h3 className="text-sm font-semibold text-gray-900">Categories</h3>
                      <p className="text-xs text-gray-500 mt-1">Filter by category</p>
                    </div>

                    {/* Scrollable Sidebar Content */}
                    <div className="flex-1 overflow-y-auto seamless-scroll p-3">
                      <CategoryFilter
                        categories={categoriesWithCounts}
                        selectedCategory={selectedCategory}
                        onSelectCategory={handleCategorySelect}
                        showFavoritesCount={stats.favorites}
                        onShowFavorites={handleShowFavorites}
                        isShowingFavorites={isShowingFavorites}
                      />
                    </div>

                    {/* Sidebar Footer */}
                    <PasswordSidebarFooter 
                      totalCategories={categoriesWithCounts.length}
                      selectedCategory={selectedCategory}
                      totalPasswords={passwords.length}
                    />
                  </div>
                </div>

                {/* Right Column - Password List - 9 columns */}
                <div className="col-span-9 flex flex-col min-h-0">
                  <div className="flex-1 min-h-0">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-[calc(100vh-180px)]">
                      {/* Search and Filter Section */}
                      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200">
                        <SearchAndFilter
                          searchQuery={searchQuery}
                          onSearchChange={setSearchQuery}
                          selectedCategory={selectedCategory}
                          onCategoryChange={handleCategorySelect}
                          categories={categoriesWithCounts}
                          onAddPassword={handleAddPassword}
                        />
                      </div>

                      {/* Scrollable Password List Content */}
                      <div className="flex-1 overflow-y-auto seamless-scroll min-h-0">
                        <div className="p-4">
                          <PasswordList
                            passwords={filteredPasswords}
                            categories={categoriesWithCounts}
                            onEdit={handleEditPassword}
                            onDelete={handleDeletePassword}
                            onToggleFavorite={handleToggleFavorite}
                          />
                        </div>
                      </div>

                      {/* List Footer */}
                      <PasswordListFooter 
                        totalPasswords={passwords.length}
                        filteredPasswords={filteredPasswords.length}
                        selectedCategory={selectedCategory}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <AddPasswordDialog
        key={`${editingPassword?.id || 'new'}-${dialogOpen ? 'open' : 'closed'}`} // Force complete re-mount
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSavePassword}
        editPassword={editingPassword}
        categories={categoriesWithCounts}
      />
    </StandardLayout>
  );
};

export default PasswordManagerPage;

