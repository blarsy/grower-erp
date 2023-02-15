import { gql } from "@apollo/client";

export const owner = gql`query Owner {
    allSettings {
      nodes {
      companyByOwnerId {
        addressLine1
        addressLine2
        city
        companyNumber
        id
        name
        zipCode
      }
    }
  }}`

  export const filterCompanies = gql`query FilteredCompanies($search: String) {
    filterCompanies(searchTerm: $search) {
      nodes {
        name
        companyNumber
        id
      }
    }
  }`

  export const filterContacts = gql`query FilteredContacts($search: String) {
    filterContacts(searchTerm: $search) {
      nodes {
        id
        firstName
        lastName
        companyByCompanyId {
          name
        }
      }
    }
  }`