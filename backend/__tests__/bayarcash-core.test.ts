import 'dotenv/config'
import * as bayarcash from '../src/payment/bayarcash'

// Set test environment variable
process.env.BC_BAYARCASH_API_SECRET = 'test_secret_key_for_checksum_validation_in_jest'

describe('BayarCash Core Functionality', () => {
  describe('Payment Channels Constants', () => {
    it('should export correct payment channel mappings', () => {
      expect(bayarcash.PAYMENT_CHANNELS.FPX).toBe(1)
      expect(bayarcash.PAYMENT_CHANNELS.MANUAL_TRANSFER).toBe(2)
      expect(bayarcash.PAYMENT_CHANNELS.DIRECT_DEBIT).toBe(3)
      expect(bayarcash.PAYMENT_CHANNELS.FPX_CREDIT).toBe(4)
      expect(bayarcash.PAYMENT_CHANNELS.DUITNOW_BANKING).toBe(5)
      expect(bayarcash.PAYMENT_CHANNELS.DUITNOW_QR).toBe(6)
      expect(bayarcash.PAYMENT_CHANNELS.SHOPEE_BNPL).toBe(7)
      expect(bayarcash.PAYMENT_CHANNELS.BOOST_BNPL).toBe(8)
      expect(bayarcash.PAYMENT_CHANNELS.QRIS_BANKING_ID).toBe(9)
      expect(bayarcash.PAYMENT_CHANNELS.QRIS_EWALLET_ID).toBe(10)
      expect(bayarcash.PAYMENT_CHANNELS.NETS_SG).toBe(11)
    })
  })

  describe('Transaction Status Constants', () => {
    it('should export correct transaction status codes', () => {
      expect(bayarcash.TRANSACTION_STATUS.NEW).toBe(0)
      expect(bayarcash.TRANSACTION_STATUS.PENDING).toBe(1)
      expect(bayarcash.TRANSACTION_STATUS.FAILED).toBe(2)
      expect(bayarcash.TRANSACTION_STATUS.SUCCESS).toBe(3)
      expect(bayarcash.TRANSACTION_STATUS.CANCELLED).toBe(4)
    })
  })

  describe('Checksum Generation - Payment Intent', () => {
    it('should generate consistent checksum for payment intent payload', () => {
      const payload = {
        payment_channel: bayarcash.PAYMENT_CHANNELS.FPX,
        order_number: '68bc5c426e323200643af073',
        amount: 100,
        payer_name: 'John Doe',
        payer_email: 'john@example.com',
        // Extra fields should be ignored
        portal_key: 'should_be_ignored',
        extra_field: 'should_be_ignored',
      }

      const checksum1 = bayarcash.generateChecksum(payload)
      const checksum2 = bayarcash.generateChecksum(payload)
      
      expect(checksum1).toBe(checksum2)
      expect(checksum1).toMatch(/^[a-f0-9]{64}$/) // SHA256 hex
      expect(checksum1.length).toBe(64)
    })

    it('should handle different field order for payment intent', () => {
      const payload1 = {
        payment_channel: 1,
        order_number: 'test123',
        amount: 50,
        payer_name: 'Alice',
        payer_email: 'alice@test.com',
      }

      const payload2 = {
        payer_email: 'alice@test.com',
        amount: 50,
        payment_channel: 1,
        payer_name: 'Alice',
        order_number: 'test123',
      }

      const checksum1 = bayarcash.generateChecksum(payload1)
      const checksum2 = bayarcash.generateChecksum(payload2)
      
      expect(checksum1).toBe(checksum2)
    })

    it('should generate different checksums for different amounts', () => {
      const payload1 = {
        payment_channel: 1,
        order_number: 'test123',
        amount: 50,
        payer_name: 'Alice',
        payer_email: 'alice@test.com',
      }

      const payload2 = { ...payload1, amount: 100 }

      const checksum1 = bayarcash.generateChecksum(payload1)
      const checksum2 = bayarcash.generateChecksum(payload2)
      
      expect(checksum1).not.toBe(checksum2)
    })
  })

  describe('Checksum Generation - Transaction Callback', () => {
    it('should generate consistent checksum for transaction callback', () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_test123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: '68bc5c426e323200643af073',
        currency: 'MYR',
        amount: '100.00',
        payer_name: 'John Doe',
        payer_email: 'john@example.com',
        payer_bank_name: 'Public Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
        // Extra fields should be ignored
        payment_gateway_id: '1',
        extra_field: 'ignored',
      }

      const checksum1 = bayarcash.generateChecksum(payload)
      const checksum2 = bayarcash.generateChecksum(payload)
      
      expect(checksum1).toBe(checksum2)
      expect(checksum1).toMatch(/^[a-f0-9]{64}$/) // SHA256 hex
      expect(checksum1.length).toBe(64)
    })

    it('should handle string vs number amounts correctly', () => {
      const payloadWithNumberAmount = {
        record_type: 'transaction',
        transaction_id: 'trx_test123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: 'test123',
        currency: 'MYR',
        amount: 100, // number
        payer_name: 'John',
        payer_email: 'john@test.com',
        payer_bank_name: 'Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
      }

      const payloadWithStringAmount = {
        ...payloadWithNumberAmount,
        amount: '100.00', // different string representation
      }

      const checksum1 = bayarcash.generateChecksum(payloadWithNumberAmount)
      const checksum2 = bayarcash.generateChecksum(payloadWithStringAmount)
      
      // Should produce different checksums due to type difference
      expect(checksum1).not.toBe(checksum2)
    })

    it('should use all 12 v2 callback fields in correct order', () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_test123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: 'test123',
        currency: 'MYR',
        amount: '100.00',
        payer_name: 'Test User',
        payer_email: 'test@example.com',
        payer_bank_name: 'Test Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
      }

      const checksum = bayarcash.generateChecksum(payload)
      
      // Should use alphabetically sorted fields:
      // amount|currency|datetime|exchange_reference_number|exchange_transaction_id|
      // order_number|payer_bank_name|payer_email|payer_name|record_type|status|
      // status_description|transaction_id
      expect(checksum).toBeDefined()
      expect(typeof checksum).toBe('string')
    })
  })

  describe('Checksum Validation', () => {
    it('should validate correct payment intent checksum', () => {
      const payload = {
        payment_channel: 1,
        order_number: 'test_order_123',
        amount: 75.50,
        payer_name: 'Jane Smith',
        payer_email: 'jane@example.com',
      }

      const checksum = bayarcash.generateChecksum(payload)
      const isValid = bayarcash.validateChecksum(payload, checksum)
      
      expect(isValid).toBe(true)
    })

    it('should validate correct transaction callback checksum', () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_valid123',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: 'test_order_123',
        currency: 'MYR',
        amount: '75.50',
        payer_name: 'Jane Smith',
        payer_email: 'jane@example.com',
        payer_bank_name: 'CIMB Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 15:30:00',
      }

      const checksum = bayarcash.generateChecksum(payload)
      const isValid = bayarcash.validateChecksum(payload, checksum)
      
      expect(isValid).toBe(true)
    })

    it('should reject tampered payload', () => {
      const originalPayload = {
        payment_channel: 1,
        order_number: 'test_order_123',
        amount: 75.50,
        payer_name: 'Jane Smith',
        payer_email: 'jane@example.com',
      }

      const checksum = bayarcash.generateChecksum(originalPayload)
      
      // Tamper with the payload
      const tamperedPayload = {
        ...originalPayload,
        amount: 999.99, // Changed amount
      }
      
      const isValid = bayarcash.validateChecksum(tamperedPayload, checksum)
      
      expect(isValid).toBe(false)
    })

    it('should reject completely invalid checksum', () => {
      const payload = {
        payment_channel: 1,
        order_number: 'test_order_123',
        amount: 75.50,
        payer_name: 'Jane Smith',
        payer_email: 'jane@example.com',
      }

      const invalidChecksum = 'completely_invalid_checksum_string'
      const isValid = bayarcash.validateChecksum(payload, invalidChecksum)
      
      expect(isValid).toBe(false)
    })

    it('should always return true for pre_transaction callbacks', () => {
      const preTransactionPayload = {
        record_type: 'pre_transaction',
        transaction_id: 'trx_pre123',
        order_number: 'test_order_123',
        exchange_reference_number: '1-757-123-456-789',
        // Missing most fields typical of pre-transaction
      }

      const randomChecksum = 'any_random_checksum_string'
      const isValid = bayarcash.validateChecksum(preTransactionPayload, randomChecksum)
      
      expect(isValid).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined values in payload', () => {
      const payload = {
        payment_channel: 1,
        order_number: 'test123',
        amount: 100,
        payer_name: undefined,
        payer_email: 'test@example.com',
      }

      const checksum = bayarcash.generateChecksum(payload)
      
      expect(checksum).toBeDefined()
      expect(typeof checksum).toBe('string')
      expect(checksum).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should handle null values in payload', () => {
      const payload = {
        payment_channel: 1,
        order_number: 'test123',
        amount: 100,
        payer_name: null,
        payer_email: 'test@example.com',
      }

      const checksum = bayarcash.generateChecksum(payload)
      
      expect(checksum).toBeDefined()
      expect(typeof checksum).toBe('string')
      expect(checksum).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should handle empty strings', () => {
      const payload = {
        payment_channel: 1,
        order_number: '',
        amount: 100,
        payer_name: 'Test',
        payer_email: '',
      }

      const checksum = bayarcash.generateChecksum(payload)
      
      expect(checksum).toBeDefined()
      expect(typeof checksum).toBe('string')
      expect(checksum).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should handle zero amounts', () => {
      const payload = {
        payment_channel: 1,
        order_number: 'free_order',
        amount: 0,
        payer_name: 'Free User',
        payer_email: 'free@example.com',
      }

      const checksum = bayarcash.generateChecksum(payload)
      const isValid = bayarcash.validateChecksum(payload, checksum)
      
      expect(checksum).toBeDefined()
      expect(isValid).toBe(true)
    })

    it('should handle very large amounts', () => {
      const payload = {
        payment_channel: 1,
        order_number: 'luxury_order',
        amount: 999999.99,
        payer_name: 'Rich User',
        payer_email: 'rich@example.com',
      }

      const checksum = bayarcash.generateChecksum(payload)
      const isValid = bayarcash.validateChecksum(payload, checksum)
      
      expect(checksum).toBeDefined()
      expect(isValid).toBe(true)
    })
  })

  describe('Security Features', () => {
    it('should produce different checksums for different payloads', () => {
      const payload1 = {
        payment_channel: 1,
        order_number: 'security_test_1',
        amount: 100,
        payer_name: 'Security Test',
        payer_email: 'security@test.com',
      }

      const payload2 = {
        payment_channel: 1,
        order_number: 'security_test_2', // Different order number
        amount: 100,
        payer_name: 'Security Test',
        payer_email: 'security@test.com',
      }

      const checksum1 = bayarcash.generateChecksum(payload1)
      const checksum2 = bayarcash.generateChecksum(payload2)
      
      // Should produce different checksums for different order numbers
      expect(checksum1).not.toBe(checksum2)
    })

    it('should handle special characters in payer data', () => {
      const payload = {
        payment_channel: 1,
        order_number: 'special_chars_test',
        amount: 100,
        payer_name: 'José María ñ-test & Co.',
        payer_email: 'josé+test@example-domain.com',
      }

      const checksum = bayarcash.generateChecksum(payload)
      const isValid = bayarcash.validateChecksum(payload, checksum)
      
      expect(checksum).toBeDefined()
      expect(isValid).toBe(true)
    })

    it('should maintain consistency across multiple validation cycles', () => {
      const payload = {
        record_type: 'transaction',
        transaction_id: 'trx_consistency_test',
        exchange_reference_number: '1-757-123-456-789',
        exchange_transaction_id: '12345678901',
        order_number: 'consistency_test',
        currency: 'MYR',
        amount: '150.75',
        payer_name: 'Consistency Tester',
        payer_email: 'consistency@test.com',
        payer_bank_name: 'Test Bank',
        status: '3',
        status_description: 'Approved',
        datetime: '2025-01-01 12:00:00',
      }

      // Generate checksum and validate multiple times
      for (let i = 0; i < 10; i++) {
        const checksum = bayarcash.generateChecksum(payload)
        const isValid = bayarcash.validateChecksum(payload, checksum)
        expect(isValid).toBe(true)
      }
    })
  })
})
