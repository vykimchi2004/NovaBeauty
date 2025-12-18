import apiClient from './api';
import { API_ENDPOINTS } from './config';

/**
 * Ticket Service - Quản lý khiếu nại/complaints
 */
const ticketService = {
    /**
     * Lấy tất cả tickets
     */
    async getAllTickets() {
        try {
            return await apiClient.get('/api/tickets');
        } catch (error) {
            console.error('[Ticket Service] getAllTickets error:', error);
            throw error;
        }
    },

    /**
     * Lấy ticket theo ID
     */
    async getTicketById(id) {
        try {
            return await apiClient.get(`/api/tickets/${id}`);
        } catch (error) {
            console.error('[Ticket Service] getTicketById error:', error);
            throw error;
        }
    },

    /**
     * Tạo ticket mới
     */
    async createTicket(ticketData) {
        try {
            return await apiClient.post('/api/tickets', ticketData);
        } catch (error) {
            console.error('[Ticket Service] createTicket error:', error);
            throw error;
        }
    },

    /**
     * Cập nhật ticket
     */
    async updateTicket(id, ticketData) {
        try {
            return await apiClient.patch(`/api/tickets/${id}`, ticketData);
        } catch (error) {
            console.error('[Ticket Service] updateTicket error:', error);
            throw error;
        }
    },

    /**
     * Escalate ticket
     */
    async escalateTicket(id) {
        try {
            return await apiClient.post(`/api/tickets/${id}/escalate`, {});
        } catch (error) {
            console.error('[Ticket Service] escalateTicket error:', error);
            throw error;
        }
    },

    /**
     * Resolve ticket
     * @param {string} id - Ticket ID
     * @param {Object} notes - { csNote, adminNote }
     */
    async resolveTicket(id, notes = {}) {
        try {
            return await apiClient.post(`/api/tickets/${id}/resolve`, notes);
        } catch (error) {
            console.error('[Ticket Service] resolveTicket error:', error);
            throw error;
        }
    },
};

export default ticketService;

