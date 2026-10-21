import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useHylana } from './HylanaContext';

/**
 * L'ancienne adresse /assistant : Hylana s'ouvre désormais par-dessus le
 * back-office. Un lien ou un favori gardé l'ouvre en grand, sur le tableau de
 * bord.
 */
const Assistant: React.FC = () => {
    const hylana = useHylana();

    useEffect(() => {
        hylana?.ouvrir('grand');
    }, [hylana]);

    return <Navigate to="/dashboard" replace />;
};

export default Assistant;
