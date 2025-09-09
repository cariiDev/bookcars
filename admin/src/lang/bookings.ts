import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_BOOKING: 'Nouvelle réservation',
    EXPORT_BOOKINGS: 'Exporter les réservations',
    EXPORT_SUCCESS: 'Réservations exportées avec succès',
    EXPORT_ERROR: 'Erreur lors de l\'exportation',
  },
  en: {
    NEW_BOOKING: 'New Booking',
    EXPORT_BOOKINGS: 'Export Bookings',
    EXPORT_SUCCESS: 'Bookings exported successfully',
    EXPORT_ERROR: 'Error exporting bookings',
  },
  es: {
    NEW_BOOKING: 'Nueva reserva',
    EXPORT_BOOKINGS: 'Exportar reservas',
    EXPORT_SUCCESS: 'Reservas exportadas exitosamente',
    EXPORT_ERROR: 'Error al exportar reservas',
  },
})

langHelper.setLanguage(strings)
export { strings }
