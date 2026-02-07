import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Search, Trash2, Edit2, Loader2, RefreshCw } from 'lucide-react';

interface Product {
    id: string;
    sku: string;
    name: string;
    unit: string;
    min_stock: number;
}

export const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/products');
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await api.delete(`/products/${id}`);
            fetchProducts();
        } catch (error) {
            alert('Failed to delete product');
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Products</h1>
                    <p className="text-slate-500 mt-1">Manage your product catalog</p>
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-indigo-200">
                    <Plus size={20} />
                    New Product
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <button onClick={fetchProducts} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
                        <RefreshCw size={20} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Unit</th>
                                <th className="px-6 py-4">Min Stock</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <Loader2 className="animate-spin inline-block mb-2" />
                                        <p>Loading products...</p>
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        No products found.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-500">{product.sku}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{product.unit}</span>
                                        </td>
                                        <td className="px-6 py-4">{product.min_stock}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
