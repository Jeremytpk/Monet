import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export function useRecipientData(user, t) {
  const [recipients, setRecipients] = useState([]);
  const [mostSentUids, setMostSentUids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch public profiles of users who have a wallet
        const usersSnap = await getDocs(query(collection(db, 'profiles'), where('has_wallet', '==', true)));
        const userList = [];
        usersSnap.forEach((doc) => {
          if (doc.id !== user.uid) {
            userList.push({ id: doc.id, ...doc.data() });
          }
        });
        setRecipients(userList);

        // Fetch recent transactions to find most sent uids
        const txQuery = query(
          collection(db, 'users', user.uid, 'transactions'),
          where('status', '==', 'completed'),
          orderBy('timestamp', 'desc'),
          limit(200)
        );
        const txSnap = await getDocs(txQuery);
        const seen = new Set();
        const uids = [];
        txSnap.forEach((doc) => {
          const data = doc.data();
          const recipientId = data.type === 'outgoing_transfer' ? data.receiver_id : data.metadata?.mcp_uid;
          if (recipientId && !seen.has(recipientId)) {
            seen.add(recipientId);
            uids.push(recipientId);
          }
        });
        setMostSentUids(uids);
      } catch (e) {
        Alert.alert(t.error, e?.message || t.errLoadRecipients);
        setRecipients([]);
        setMostSentUids([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid, t]);

  return { recipients, setRecipients, mostSentUids, loading };
}