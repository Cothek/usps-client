/**
 * @fileOverview Constants for USPS service types and filtering.
 */

export const USPS_SERVICE_TYPES = [
  { id: 'PRIORITY_MAIL_EXPRESS_HEADER', name: 'Priority Mail Express', isHeader: true },
  { id: 'PRIORITY_MAIL_EXPRESS', name: 'All Priority Mail Express', isSubItem: true },
  { id: 'PRIORITY_MAIL_EXPRESS_FLAT_RATE', name: 'Flat Rate', isSubItem: true },

  { id: 'PRIORITY_MAIL_HEADER', name: 'Priority Mail', isHeader: true },
  { id: 'PRIORITY_MAIL', name: 'All Priority Mail', isSubItem: true },
  { id: 'PRIORITY_MAIL_FLAT_RATE', name: 'Flat Rate', isSubItem: true },
  { id: 'PRIORITY_MAIL_CUBIC', name: 'Cubic', isSubItem: true },
  
  { id: 'GROUND_ADVANTAGE_HEADER', name: 'USPS Ground Advantage', isHeader: true },
  { id: 'USPS_GROUND_ADVANTAGE', name: 'All Ground Advantage', isSubItem: true },
  { id: 'USPS_GROUND_ADVANTAGE_CUBIC', name: 'Cubic', isSubItem: true },
  
  { id: 'OTHER_SERVICES_HEADER', name: 'Other Services', isHeader: true },
  { id: 'MEDIA_MAIL', name: 'Media Mail', isSubItem: true },
  { id: 'LIBRARY_MAIL', name: 'Library Mail', isSubItem: true },
  { id: 'BOUND_PRINTED_MATTER', name: 'Bound Printed Matter', isSubItem: true },
  { id: 'CONNECT_LOCAL', name: 'Connect Local', isSubItem: true },
];

export const serviceFilterMap: Record<string, { mailClasses: string[], keywords: string[], exclusions?: string[] }> = {
    'PRIORITY_MAIL_EXPRESS': { 
        mailClasses: ['PRIORITY_MAIL_EXPRESS'], 
        keywords: ['priority mail express'],
        exclusions: ['flat rate']
    },
    'PRIORITY_MAIL_EXPRESS_FLAT_RATE': { 
        mailClasses: ['PRIORITY_MAIL_EXPRESS'], 
        keywords: ['flat rate'] 
    },
    'PRIORITY_MAIL': { 
        mailClasses: ['PRIORITY_MAIL'], 
        keywords: ['priority mail'],
        exclusions: ['flat rate', 'cubic']
    },
    'PRIORITY_MAIL_FLAT_RATE': { 
        mailClasses: ['PRIORITY_MAIL'], 
        keywords: ['flat rate'] 
    },
    'PRIORITY_MAIL_CUBIC': { 
        mailClasses: ['PRIORITY_MAIL'], 
        keywords: ['cubic'] 
    },
    'USPS_GROUND_ADVANTAGE': { 
        mailClasses: ['USPS_GROUND_ADVANTAGE'], 
        keywords: ['ground advantage'],
        exclusions: ['cubic']
    },
    'USPS_GROUND_ADVANTAGE_CUBIC': { 
        mailClasses: ['USPS_GROUND_ADVANTAGE'], 
        keywords: ['cubic'] 
    },
    'MEDIA_MAIL': { 
        mailClasses: ['MEDIA_MAIL'], 
        keywords: ['media mail'] 
    },
    'LIBRARY_MAIL': { 
        mailClasses: ['LIBRARY_MAIL'], 
        keywords: ['library mail'] 
    },
    'BOUND_PRINTED_MATTER': { 
        mailClasses: ['BOUND_PRINTED_MATTER'], 
        keywords: ['bound printed matter'] 
    },
    'CONNECT_LOCAL': { 
        mailClasses: ['USPS_GROUND_ADVANTAGE'], 
        keywords: ['connect local'] 
    },
};
