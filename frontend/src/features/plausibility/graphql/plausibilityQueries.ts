import { gql } from '@apollo/client';

export const GET_PLAUSIBILITY_ISSUES = gql`
  query GetPlausibilityIssues {
    plausibilityIssues {
      key
      code
      relationId
      eventId
      role
      gender
      kinship
      age
      inexact
      count
      event
      checked
      persons {
        id
        title
        firstName
        middleName
        lastName
        birthName
      }
    }
  }
`;

export const GET_OPEN_PLAUSIBILITY_ISSUES = gql`
  query GetOpenPlausibilityIssues {
    openPlausibilityIssues
  }
`;

export const CHECK_PLAUSIBILITY_ISSUE = gql`
  mutation CheckPlausibilityIssue($key: String!, $checked: Boolean!) {
    checkPlausibilityIssue(key: $key, checked: $checked)
  }
`;
