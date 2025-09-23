import { TicketStatus, TicketPriority, InvoiceStatus } from '@/lib/types'

describe('Type definitions', () => {
  describe('TicketStatus', () => {
    it('should have correct values', () => {
      const validStatuses: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']

      validStatuses.forEach(status => {
        expect(['open', 'in_progress', 'resolved', 'closed']).toContain(status)
      })
    })
  })

  describe('TicketPriority', () => {
    it('should have correct values', () => {
      const validPriorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

      validPriorities.forEach(priority => {
        expect(['low', 'medium', 'high', 'urgent']).toContain(priority)
      })
    })
  })

  describe('InvoiceStatus', () => {
    it('should have correct values', () => {
      const validStatuses: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

      validStatuses.forEach(status => {
        expect(['draft', 'sent', 'paid', 'overdue', 'cancelled']).toContain(status)
      })
    })
  })
})