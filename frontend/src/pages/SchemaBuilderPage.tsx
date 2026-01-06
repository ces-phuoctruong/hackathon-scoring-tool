import { useState, useEffect } from 'react';
import SchemaBuilder from '../components/SchemaBuilder';
import SchemaList from '../components/SchemaList';
import { schemaApi } from '../services/api';
import type { ScoringSchema, ScoringSchemaInput } from '../types';

type ViewMode = 'list' | 'create' | 'edit';

export default function SchemaBuilderPage() {
  const [schemas, setSchemas] = useState<ScoringSchema[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingSchema, setEditingSchema] = useState<ScoringSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchemas = async () => {
    try {
      setIsLoading(true);
      const response = await schemaApi.getAll();
      setSchemas(response.data.schemas);
      setError(null);
    } catch (err) {
      console.error('Error fetching schemas:', err);
      setError('Failed to load schemas. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemas();
  }, []);

  const handleCreate = async (data: ScoringSchemaInput) => {
    try {
      setIsSaving(true);
      await schemaApi.create(data);
      await fetchSchemas();
      setViewMode('list');
      setError(null);
    } catch (err) {
      console.error('Error creating schema:', err);
      setError('Failed to create schema. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: ScoringSchemaInput) => {
    if (!editingSchema) return;

    try {
      setIsSaving(true);
      await schemaApi.update(editingSchema._id, data);
      await fetchSchemas();
      setViewMode('list');
      setEditingSchema(null);
      setError(null);
    } catch (err) {
      console.error('Error updating schema:', err);
      setError('Failed to update schema. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await schemaApi.delete(id);
      await fetchSchemas();
      setError(null);
    } catch (err) {
      console.error('Error deleting schema:', err);
      setError('Failed to delete schema. Please try again.');
    }
  };

  const handleEdit = (schema: ScoringSchema) => {
    setEditingSchema(schema);
    setViewMode('edit');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingSchema(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoring Schemas</h1>
          <p className="text-gray-600 mt-1">
            {viewMode === 'list' && 'Create and manage scoring schemas for test evaluation.'}
            {viewMode === 'create' && 'Create a new scoring schema.'}
            {viewMode === 'edit' && `Editing: ${editingSchema?.name}`}
          </p>
        </div>
        {viewMode === 'list' && (
          <button
            onClick={() => setViewMode('create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + New Schema
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {viewMode === 'list' && (
        <SchemaList
          schemas={schemas}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      )}

      {viewMode === 'create' && (
        <SchemaBuilder
          onSubmit={handleCreate}
          onCancel={handleCancel}
          isLoading={isSaving}
        />
      )}

      {viewMode === 'edit' && editingSchema && (
        <SchemaBuilder
          initialData={{
            name: editingSchema.name,
            version: editingSchema.version,
            description: editingSchema.description || '',
            questions: editingSchema.questions,
            rubricGuidelines: editingSchema.rubricGuidelines,
          }}
          onSubmit={handleUpdate}
          onCancel={handleCancel}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}
