import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface EntityListProps<T> {
  endpoint: string;
  renderItem: (item: T) => ReactNode;
  itemKey: keyof T & string;
}

const EntityList = <T,>({ endpoint, renderItem, itemKey }: EntityListProps<T>) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, error } = useQuery<T[], Error>({
    queryKey: ['compendium', endpoint, search, page],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/${endpoint}`, {
        params: {
          skip: page * limit,
          limit,
          search,
        },
      });
      return response.data;
    },
  });

  if (isLoading) return <div className="flex min-h-[200px] items-center justify-center">Loading...</div>;
  if (error) return <div className="flex min-h-[200px] items-center justify-center text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <label className="mb-2 text-sm font-medium text-gray-300">Search</label>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0); // reset to first page on new search
          }}
          className="w-full px-4 py-2 rounded border border-gray-600 bg-gray-800/50 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((item) => (
          <div key={String(item[itemKey])} className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors cursor-pointer">
            {renderItem(item as T)}
          </div>
        )) ?? []}
      </div>
      {data && data.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={page === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {page + 1}</span>
          <button
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!data || data.length < limit}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default EntityList;