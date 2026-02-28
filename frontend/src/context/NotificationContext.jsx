import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios'; // Ensure we use the configured axios instance
import Toast from '../components/Toast';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [toasts, setToasts] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        // Expose testing function globally
        window.testNotification = (msg) => {
            const newNotif = { id: Date.now(), message: msg || "Test Notification" };
            addNotificationWrapper(newNotif);
        };

        if (user) {
            fetchNotifications();
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications/');
            // Handle pagination: DRF may return { results: [...] }
            const data = (res.data && res.data.results) ? res.data.results : (Array.isArray(res.data) ? res.data : []);
            setNotifications(data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        if (!user) {
            console.log("NotificationSocket: No user found, skipping connection.");
            return;
        }

        console.log(`NotificationSocket: Connecting for user ${user.id}...`);

        // Connect to Notification WebSocket with Auth Token
        const token = localStorage.getItem('access');
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${wsProtocol}//localhost:8000/ws/notifications/${user.id}/?token=${token}`);

        socket.onopen = () => {
            console.log("NotificationSocket: Connected");
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("NotificationSocket: Received data", data);
                if (data.type === 'notification' || data.type === 'send_notification') { // Handle both just in case
                    // The backend sends 'send_notification' wrapper or direct 'notification' payload?
                    // In consumers.py: "type": "notification", "notification": ...
                    // In views.py: 'type': 'send_notification', 'notification': ...
                    // Channels routing calls consumer.send_notification(event).
                    // Consumer sends: {'type': 'notification', 'notification': sub-payload}. 
                    // So event.data has type: 'notification'.
                    // So event.data has type: 'notification'.
                    addNotificationWrapper(data.notification);
                }
            } catch (err) {
                console.error("NotificationSocket: Error parsing message", err);
            }
        };

        socket.onerror = (error) => {
            console.error("NotificationSocket: Error", error);
        };

        socket.onclose = (e) => {
            console.log("NotificationSocket: Closed", e.reason);
        };

        socketRef.current = socket;

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [user]);

    const addNotificationWrapper = (notif) => {
        // Standardize format: ensure it has id and message
        const newNotif = {
            id: notif.id || Date.now(),
            message: notif.message || notif.text || notif,
            type: notif.notification_type || notif.type || 'info',
            related_id: notif.related_id,
            ...notif
        };

        // Prevent duplicate IDs if rapid firing
        setNotifications(prev => {
            const list = Array.isArray(prev) ? prev : [];
            if (list.some(n => n.id === newNotif.id)) return list;
            return [newNotif, ...list];
        });

        setToasts(prev => {
            if (prev.some(n => n.id === newNotif.id)) return prev;
            return [...prev, newNotif];
        });
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const updateNotification = (id, updates) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    };

    const clearNotifications = async () => {
        try {
            await api.delete('/notifications/clear/');
            setNotifications([]);
        } catch (err) {
            console.error("Failed to clear", err);
            setNotifications([]); // Optimistic clear
        }
    };

    const unreadCount = Array.isArray(notifications) ? notifications.length : 0;

    return (
        <NotificationContext.Provider value={{ addNotification: addNotificationWrapper, notifications, unreadCount, clearNotifications, fetchNotifications, updateNotification }}>
            {children}
            <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(n => (
                    <div key={n.id} className="pointer-events-auto">
                        <Toast
                            message={n.message}
                            onClose={() => removeToast(n.id)}
                        />
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
