import { gql } from "@apollo/client"
import { filterCompanies } from "lib/components/queriesLib"
import * as yup from 'yup'
import DatagridAdminView from "./DatagridAdminView"


const GET = gql`query ContactAdminViewAllContactsQuery {
  allContacts {
    nodes {
      addressLine1
      addressLine2
      city
      companyId
      email
      firstName
      id
      lastName
      phone
      publicKey
      zipCode
    }
  }
}`

const UPDATE = gql`mutation UpdateContact($addressLine1: String, $addressLine2: String, 
    $city: String, $companyId: Int, $firstName: String!, $email: String, $id: Int!, 
    $lastName: String!, $phone: String, $publicKey: String, $zipCode: String) {
    updateContactById(
        input: {contactPatch: {addressLine1: $addressLine1, addressLine2: $addressLine2, 
            city: $city, email: $email, firstName: $firstName, lastName: $lastName, 
            phone: $phone, publicKey: $publicKey, zipCode: $zipCode, companyId: $companyId}, id: $id}
    ){
      contact {
        addressLine1
        addressLine2
        city
        companyId
        email
        firstName
        id
        lastName
        phone
        publicKey
        zipCode
      }
    }
  }`

const CREATE = gql`mutation CreateContact($zipCode: String, $publicKey: String, 
    $phone: String, $lastName: String!, $firstName: String!, $email: String, 
    $companyId: Int, $city: String, $addressLine2: String, $addressLine1: String) {
    createContact(
      input: {contact: {lastName: $lastName, addressLine1: $addressLine1, 
        addressLine2: $addressLine2, city: $city, companyId: $companyId, 
        email: $email, firstName: $firstName, phone: $phone, 
        publicKey: $publicKey, zipCode: $zipCode}}
    ) {
      contact {
        addressLine1
        addressLine2
        city
        companyId
        email
        firstName
        id
        lastName
        phone
        publicKey
        zipCode
      }
    }
  }`


const ContactAdminView = () => {
    return <DatagridAdminView title="Personnes" dataName="Contact" getQuery={GET} createQuery={CREATE}
    updateQuery={UPDATE} columns={[
      { key: 'id', headerText: 'ID', widthPercent: 3, type: "number"},
      { key: 'lastName', headerText: 'Nom', widthPercent: 10, type: "string",  editable: {
        validation: yup.string().required('Ce champ est requis') 
      }},
      { key: 'firstName', headerText: 'Prénom', widthPercent: 10, type: "string",  editable: {
        validation: yup.string().required('Ce champ est requis') 
      }},
      { key: 'addressLine1', headerText: 'Adresse ligne 1', widthPercent: 12.5, type: "string", editable: {
          validation: yup.string()
        }
      },
      { key: 'addressLine2', headerText: 'Adresse ligne 2', widthPercent: 12.5, type: "string", editable: {
          validation: yup.string()
        }
      },
      { key: 'zipCode', headerText: 'Code postal', widthPercent: 7, type: "string", editable: {
          validation: yup.string()
        }
      },
      { key: 'city', headerText: 'Localité', widthPercent: 10, type: "string", editable: {
          validation: yup.string()
        }
      },
      { key: 'phone', headerText: 'Tél', widthPercent: 10, type: "string", editable: {
          validation: yup.string()
        }
      },
      { key: 'email', headerText: 'Email', widthPercent: 10, type: "string", editable: {
          validation: yup.string().nullable().email()
        }
      },
      { key: 'publicKey', headerText: 'Clé publique', widthPercent: 10, type: "string", editable: {
          validation: yup.string().nullable()
        }
      },
      { key: 'companyId', headerText: 'Entreprise', type: "number", editable: {
          validation: yup.number().nullable()
        }, relation: { query: filterCompanies, getLabel: (rec) => {
            if(rec.companyNumber) return `${rec.name} - ${rec.companyNumber}`
            else return rec.name
          }}
      }]} />
}

export default ContactAdminView
