import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ContributorLayout from '../../components/contributor/ContributorLayout';
import ApiService from '../../services/ApiService';

interface ContributorPaymentsProps {
    onLogout: () => void;
    user: any;
}

const ContributorPayments: React.FC<ContributorPaymentsProps> = ({ onLogout, user }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<any>(null);
    const [balance, setBalance] = useState<number>(user?.balance || 0);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawPhone, setWithdrawPhone] = useState(user?.telephone || '');
    const [withdrawMode, setWithdrawMode] = useState('OM'); // Default to Orange Money
    const [submitting, setSubmitting] = useState(false);

    const api = new ApiService();

    const fetchTransactions = async (url = `utilisateur/get-contributor-transactions?user_id=${user.id}`) => {
        setLoading(true);
        try {
            const res = await api.getData(url);
            if (res.data.success) {
                setTransactions(res.data.data.data);
                setPagination(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Erreur lors de la récupération des transactions');
        } finally {
            setLoading(false);
        }
    };

    const fetchBalance = async () => {
        try {
            const res = await api.getData(`utilisateur/get-contributor-stats?user_id=${user.id}`);
            if (res.data.success) {
                setBalance(res.data.data.balance);
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchTransactions();
            fetchBalance();
        }
    }, [user?.id]);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(withdrawAmount);

        if (amount <= 0) {
            toast.error('Le montant doit être supérieur à 0');
            return;
        }

        if (amount > balance) {
            toast.error('Solde insuffisant');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.postData('utilisateur/withdrawal', {
                user_id: user.id,
                amount: amount,
                receiver_phone: withdrawPhone,
                mode: withdrawMode, // Orange Money = OM, MTN = MNP ? Need to verify backend mode mapping
            });

            if (res.data.success) {
                toast.success('Demande de retrait envoyée avec succès');
                setShowWithdrawModal(false);
                setWithdrawAmount('');
                fetchBalance();
                fetchTransactions();
            } else {
                toast.error(res.data.message || 'Erreur lors de la demande de retrait');
            }
        } catch (error: any) {
            console.error('Withdrawal error:', error);
            toast.error(error.response?.data?.message || 'Une erreur est survenue');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePageChange = (url: string) => {
        if (url) {
            const pageParam = url.split('?')[1];
            fetchTransactions(`utilisateur/get-contributor-transactions?user_id=${user.id}&${pageParam}`);
        }
    };

    return (
        <ContributorLayout user={user} onLogout={onLogout}>
            {/* Header */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-emerald-800 tracking-tight mb-1">Mes Paiements</h2>
                    <p className="text-slate-500 font-medium">Gérez vos revenus et vos retraits en toute sécurité.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Balance Card & Actions */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-emerald-100 font-bold text-xs uppercase tracking-widest mb-2 opacity-80">Solde Disponible</p>
                            <h3 className="text-5xl font-black mb-6">
                                {balance.toLocaleString('fr-FR')}
                                <span className="text-xl font-bold opacity-70 ml-2">FCFA</span>
                            </h3>

                            <div className="pt-6 border-t border-white/10 flex gap-4">
                                <button
                                    onClick={() => setShowWithdrawModal(true)}
                                    className="flex-1 bg-white text-emerald-800 font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <span className="material-symbols-outlined text-lg">payout</span>
                                    Retirer
                                </button>
                                <button
                                    className="flex-1 bg-emerald-500/30 backdrop-blur-md text-white border border-white/20 font-bold py-3 px-4 rounded-xl hover:bg-emerald-500/40 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <span className="material-symbols-outlined text-lg">add_card</span>
                                    Dépôt
                                </button>
                            </div>
                        </div>

                        {/* Decorative background element */}
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"/>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">info</span>
                            Informations
                        </h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-emerald-600 mt-0.5">verified</span>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Les retraits sont traités dans un délai de <strong className="text-slate-700">24h à 48h</strong> ouvrées.
                                </p>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-emerald-600 mt-0.5">verified</span>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Commission Ongo: <strong className="text-slate-700">20%</strong> déjà déduite de votre solde.
                                </p>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Right: Transaction History */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                            <h4 className="text-lg font-bold text-slate-800 tracking-tight">Historique des Transactions</h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-full">
                                {pagination?.total || 0} Total
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Montant</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {loading ? (
                                        Array(6).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={4} className="px-6 py-5">
                                                    <div className="h-4 bg-slate-100 rounded w-full"/>
                                                </td>
                                            </tr>
                                        ))
                                    ) : transactions.length > 0 ? (
                                        transactions.map((tx: any) => (
                                            <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-4 text-slate-500 font-medium">
                                                    {tx.initiated_at ? new Date(tx.initiated_at).toLocaleDateString('fr-FR') : '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`material-symbols-outlined text-lg ${tx.amount < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                            {tx.amount < 0 ? 'outbound' : 'inbound'}
                                                        </span>
                                                        <div>
                                                            <p className="font-bold text-slate-700">{tx.description || 'Transaction'}</p>
                                                            <p className="text-[10px] text-slate-400 font-semibold">{tx.provider || 'Ongo'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-black ${tx.amount < 0 ? 'text-slate-800' : 'text-emerald-700'}`}>
                                                    {Math.abs(tx.amount).toLocaleString('fr-FR')} FCFA
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                        tx.status === 'verified'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {tx.status === 'verified' ? 'Consolidé' : 'En attente'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-20 text-center text-slate-300">
                                                <span className="material-symbols-outlined text-5xl mb-3 block">manage_search</span>
                                                <p className="text-sm font-medium">Aucune transaction trouvée</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.last_page > 1 && (
                            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">Page {pagination.current_page} sur {pagination.last_page}</span>
                                <div className="flex gap-2">
                                    {pagination.links.map((link: any, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => handlePageChange(link.url)}
                                            disabled={!link.url}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                                link.active
                                                    ? 'bg-emerald-700 text-white shadow-md'
                                                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                            } ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && setShowWithdrawModal(false)}/>
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-emerald-800 p-6 text-white text-center">
                            <h3 className="text-xl font-bold">Demander un Retrait</h3>
                            <p className="text-emerald-200 text-xs font-medium mt-1">Saisissez les informations de paiement</p>
                        </div>
                        <form onSubmit={handleWithdraw} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant (FCFA)</label>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="Ex: 5000"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 outline-none focus:border-emerald-500 transition-colors"
                                    required
                                    disabled={submitting}
                                />
                                <p className="text-[10px] text-emerald-600 font-bold">Max: {balance.toLocaleString()} FCFA</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Numéro de Téléphone</label>
                                <input
                                    type="tel"
                                    value={withdrawPhone}
                                    onChange={(e) => setWithdrawPhone(e.target.value)}
                                    placeholder="Ex: 699123456"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500 transition-colors"
                                    required
                                    disabled={submitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mode de Paiement</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setWithdrawMode('OM')}
                                        className={`py-3 rounded-xl font-bold flex flex-col items-center gap-1 border-2 transition-all ${
                                            withdrawMode === 'OM'
                                                ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                                                : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'
                                        }`}
                                        disabled={submitting}
                                    >
                                        <span className="text-xs">Orange Money</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWithdrawMode('MTN')}
                                        className={`py-3 rounded-xl font-bold flex flex-col items-center gap-1 border-2 transition-all ${
                                            withdrawMode === 'MTN'
                                                ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                                                : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'
                                        }`}
                                        disabled={submitting}
                                    >
                                        <span className="text-xs">MTN Mobile Money</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowWithdrawModal(false)}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                    disabled={submitting}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-700 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                        </svg>
                                    ) : (
                                        <>Envoyer</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </ContributorLayout>
    );
};

export default ContributorPayments;
