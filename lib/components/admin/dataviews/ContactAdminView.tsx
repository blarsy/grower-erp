import { gql } from "@apollo/client"
import { filterCompanies, updateContact } from "lib/components/queriesLib"
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
      firstname
      id
      lastname
      phone
      zipCode
    }
  }
}`


const CREATE = gql`mutation CreateContact($zipCode: String, 
    $phone: String, $lastname: String!, $firstname: String!, $email: String, 
    $companyId: Int, $city: String, $addressLine2: String, $addressLine1: String) {
    createContact(
      input: {contact: {lastname: $lastname, addressLine1: $addressLine1, 
        addressLine2: $addressLine2, city: $city, companyId: $companyId, 
        email: $email, firstname: $firstname, phone: $phone, zipCode: $zipCode}}
    ) {
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


const ContactAdminView = () => {
    return <DatagridAdminView title="Personnes" dataName="Contact" getQuery={GET} createQuery={CREATE}
    updateQuery={updateContact} columns={[
      { key: 'id', headerText: 'ID', widthPercent: 3, type: "number"},
      { key: 'lastname', headerText: 'Nom', widthPercent: 10, type: "string",  editable: {
        validation: yup.string().required('Ce champ est requis') 
      }},
      { key: 'firstname', headerText: 'Prénom', widthPercent: 10, type: "string",  editable: {
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
      { key: 'companyId', headerText: 'Entreprise', type: "number", editable: {
          validation: yup.number().nullable()
        }, relation: { query: filterCompanies, getLabel: (rec) => {
            if(rec.companyNumber) return `${rec.name} - ${rec.companyNumber}`
            else return rec.name
          }}
      }]} />
}

export default ContactAdminView
