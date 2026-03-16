import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../store/useToastStore';
import { FolderOpen, Edit, Trash2 } from 'lucide-react';
import { categoriesApi } from '../../services/endpoints';

interface Category {
  id: number;
  name: string;
  parent_id?: number;
  parent_name?: string | null;
}

export const Categories = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    parent_id: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await categoriesApi.list();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch categories', error);
      toast.error(t('master.categories.createError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setFormData({ name: '', parent_id: '' });
    setIsEditing(false);
    setSelectedCategory(null);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      parent_id: category.parent_id?.toString() || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    setCategoryToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      await categoriesApi.remove(categoryToDelete);
      toast.success(t('master.categories.deleteSuccess'));
      fetchData();
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('master.categories.deleteError');
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && selectedCategory) {
        await categoriesApi.update(selectedCategory.id, {
          name: formData.name,
          parent_id: formData.parent_id ? parseInt(formData.parent_id) : null
        });
        toast.success(t('master.categories.updateSuccess'));
      } else {
        await categoriesApi.create({
          name: formData.name,
          parent_id: formData.parent_id ? parseInt(formData.parent_id) : null
        });
        toast.success(t('master.categories.createSuccess'));
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('master.categories.createError');
      toast.error(errorMessage);
    }
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: t('master.categories.name'),
      render: (category: Category) => (
        <div className="flex items-center gap-2">
          <FolderOpen size={16} className="text-slate-400" />
          <span className="font-medium text-slate-900">{category.name}</span>
        </div>
      )
    },
    {
      key: 'parent_name',
      header: t('master.categories.parentCategory'),
      render: (category: Category) => (
        <span className="text-slate-600 text-sm">{category.parent_name || t('master.categories.noCategory')}</span>
      )
    },
    {
      key: 'actions',
      header: t('common.actions') || 'Actions',
      render: (category: Category) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(category);
            }}
            className="text-slate-400 hover:text-indigo-600 transition-colors"
            title="Edit"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(category.id);
            }}
            className="text-slate-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <ActionToolbar
        title={t('master.categories.title')}
        onSearch={(term) => setSearchTerm(term)}
        onAdd={() => {
          resetForm();
          setShowModal(true);
        }}
      />

      <DataTable data={filtered} columns={columns} isLoading={loading} />

      {/* Create/Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? t('common.edit') + ' ' + t('master.categories.name') : t('master.categories.addNew')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('master.categories.name')}</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('master.categories.name')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">{t('master.categories.parentCategory')}</label>
                <select
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                >
                  <option value="">{t('master.categories.noCategory')}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {t('common.save') || 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title={t('common.delete')}
        message={t('master.categories.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setCategoryToDelete(null);
        }}
      />
    </div>
  );
};
