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
        defaultTaxRate
        defaultContainerRefundTaxRate
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
      firstname
      lastname
      companyByCompanyId {
        name
      }
    }
  }
}`

export const updateContact =  gql`mutation UpdateContact($addressLine1: String, $addressLine2: String, 
  $city: String, $companyId: Int, $firstname: String!, $email: String, $id: Int!, 
  $lastname: String!, $phone: String, $zipCode: String) {
  updateContactById(
      input: {contactPatch: {addressLine1: $addressLine1, addressLine2: $addressLine2, 
          city: $city, email: $email, firstname: $firstname, lastname: $lastname, 
          phone: $phone, zipCode: $zipCode, companyId: $companyId}, id: $id}
  ){
    contact {
      addressLine1
      addressLine2
      city
      companyId
      email
      firstname
      id
      lastname
      phone
      zipCode
    }
  }
}`

export const availableArticles = gql`query Articles {
  getAvailableArticles {
    nodes {
      articleId
      containerName
      available
      productName
      price
      quantityPerContainer
      shouldIncludeVat
      stockName
      unitAbbreviation
      fulfillmentDate
      orderClosureDate
      articleTaxRate
      containerRefundPrice
      containerRefundTaxRate
    }
  }
}`

export const setSettings = gql`mutation SetSettings($defaultTaxRate: BigFloat, $defaultContainerRefundTaxRate: BigFloat) {
  setSettings(
    input: {inputDefaultTaxRate: $defaultTaxRate, inputDefaultContainerRefundTaxRate: $defaultContainerRefundTaxRate}
  ) {
    clientMutationId
  }
}`