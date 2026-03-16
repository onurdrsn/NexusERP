import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../components/ui/DataTable';
import { ActionToolbar } from '../components/ui/ActionToolbar';
import { FileText, CheckCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '../store/useToastStore';
import { invoicesApi, ordersApi } from '../services/endpoints';

interface Invoice {
  id: string;
  sales_order_id: string;
  customer_name: string;
  order_status: string;
  total_amount: number;
  tax_amount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID';
  issued_at: string | null;
}

interface SalesOrder {
  id: string;
  customer_name: string;
  status: string;
  total_amount?: number;
}

export const Invoices = () => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Create Invoice Modal State
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [taxRate, setTaxRate] = useState(18);
  const [previewAmount, setPreviewAmount] = useState(0);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const responseData = await invoicesApi.list();
      setInvoices(Array.isArray(responseData) ? responseData : []);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = async () => {
    try {
      const ordersData = await ordersApi.list();
      // Filter to only APPROVED orders
      const approvedOrders = (Array.isArray(ordersData) ? ordersData : []).filter(
        (o: SalesOrder) => o.status === 'APPROVED'
      );
      setOrders(approvedOrders);
      setSelectedOrderId('');
      setTaxRate(18);
      setPreviewAmount(0);
      setShowModal(true);
    } catch {
      toast.error('Failed to load approved orders');
    }
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    // Calculate preview amount based on selected order
    const selected = orders.find(o => o.id === orderId);
    if (selected && selected.total_amount) {
      const subtotal = selected.total_amount;
      const tax = subtotal * (taxRate / 100);
      setPreviewAmount(Number((subtotal + tax).toFixed(2)));
    }
  };

  const handleTaxRateChange = (newRate: number) => {
    setTaxRate(newRate);
    if (selectedOrderId) {
      const selected = orders.find(o => o.id === selectedOrderId);
      if (selected && selected.total_amount) {
        const subtotal = selected.total_amount;
        const tax = subtotal * (newRate / 100);
        setPreviewAmount(Number((subtotal + tax).toFixed(2)));
      }
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast.error('Please select an order');
      return;
    }

    setCreating(true);
    try {
      await invoicesApi.create({
        sales_order_id: selectedOrderId,
        tax_rate: taxRate / 100
      });
      toast.success('Invoice created successfully');
      setShowModal(false);
      setSelectedOrderId('');
      setTaxRate(18);
      setPreviewAmount(0);
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleIssue = async (id: string) => {
    if (!confirm('Issue this invoice? It will change to ISSUED status.')) return;

    try {
      await invoicesApi.issue(id);
      toast.success('Invoice issued successfully');
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to issue invoice';
      toast.error(errorMessage);
    }
  };

  const handlePay = async (id: string) => {
    if (!confirm('Mark this invoice as paid?')) return;

    try {
      await invoicesApi.pay(id);
      toast.success('Invoice marked as paid');
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark invoice as paid';
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'DRAFT':
        return 'bg-amber-100 text-amber-800';
      case 'ISSUED':
        return 'bg-blue-100 text-blue-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const columns = [
    {
      key: 'id',
      header: t('invoices.invoiceId') || 'Invoice ID',
      render: (invoice: Invoice) => (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-slate-400" />
          <span className="font-mono text-xs">#{invoice.id.slice(0, 8)}</span>
        </div>
      )
    },
    {
      key: 'customer_name',
      header: t('common.customer') || 'Customer',
      render: (invoice: Invoice) => <span className="font-medium text-slate-900">{invoice.customer_name}</span>
    },
    {
      key: 'total_amount',
      header: t('invoices.totalAmount') || 'Total Amount',
      align: 'right' as const,
      render: (invoice: Invoice) => (
        <span className="font-mono font-bold">${Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      )
    },
    {
      key: 'tax_amount',
      header: t('invoices.taxAmount') || 'Tax',
      align: 'right' as const,
      render: (invoice: Invoice) => (
        <span className="font-mono text-slate-500 text-sm">${Number(invoice.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      )
    },
    {
      key: 'status',
      header: t('common.status') || 'Status',
      render: (invoice: Invoice) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
          {invoice.status}
        </span>
      )
    },
    {
      key: 'issued_at',
      header: t('invoices.issuedDate') || 'Issued Date',
      render: (invoice: Invoice) => (
        <span className="text-slate-500 text-xs">
          {invoice.issued_at ? format(new Date(invoice.issued_at), 'MMM d, yyyy') : '-'}
        </span>
      )
    },
    {
      key: 'actions',
      header: t('common.actions') || 'Actions',
      align: 'right' as const,
      render: (invoice: Invoice) => (
        <div className="flex justify-end gap-2">
          {invoice.status === 'DRAFT' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleIssue(invoice.id);
              }}
              className="text-slate-400 hover:text-blue-600 transition-colors"
              title="Issue invoice"
            >
              <CheckCircle size={18} />
            </button>
          )}
          {invoice.status === 'ISSUED' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePay(invoice.id);
              }}
              className="text-slate-400 hover:text-green-600 transition-colors"
              title="Mark as paid"
            >
              <DollarSign size={18} />
            </button>
          )}
        </div>
      )
    }
  ];

  const filtered = invoices.filter(inv =>
    inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ActionToolbar
        title={t('invoices.title') || 'Invoices'}
        onSearch={(term) => setSearchTerm(term)}
        onAdd={openCreateModal}
      />

      <DataTable data={filtered} columns={columns} isLoading={loading} />

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t('invoices.create') || 'Create Invoice'}</h2>
            <form onSubmit={handleCreateInvoice} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('invoices.selectOrder') || 'Select Approved Order'}
                </label>
                <select
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2.5"
                  value={selectedOrderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  required
                >
                  <option value="">Choose an order...</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      #{order.id.slice(0, 8)} - {order.customer_name}
                      {order.total_amount && ` ($${Number(order.total_amount).toLocaleString()})`}
                    </option>
                  ))}
                </select>
                {orders.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">No approved orders available</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2.5"
                  value={taxRate}
                  onChange={(e) => handleTaxRateChange(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>

              {selectedOrderId && previewAmount > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-2">Estimated Total:</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    ${previewAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!selectedOrderId || creating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : t('common.save') || 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
