import { gql } from '@apollo/client';
import { PERSON_FIELDS } from '@/features/persons/graphql/personQueries';

export const GET_TREE_STATISTICS = gql`
  query GetTreeStatistics($scope: StatisticsScope, $language: String, $ancestorsOf: ID) {
    treeStatistics(scope: $scope, language: $language, ancestorsOf: $ancestorsOf) {
      total
      living
      deceased
      male
      female
      unknownGender
      relations
      livingAges {
        from
        count
        filter
      }
      deathAges {
        from
        count
        filter
      }
      withoutAge
      probablyDeceased
      averageLifespan
      oldestBirth {
        year
        person {
          id
          title
          firstName
          middleName
          lastName
          birthName
        }
      }
      surnames {
        label
        count
        filter
      }
      distinctSurnames
      birthplaces {
        label
        count
        filter
      }
      distinctBirthplaces
      withBirthplace
      generations {
        generation
        count
        earliestBirth
        latestBirth
        filter
      }
      families
      unconnected
      completeness {
        score
        rows {
          fact
          total
          present
          missing
          filter
        }
      }
      timeline {
        decades {
          decade
          births
          deaths
          weddings
        }
        withoutBirthYear
        withoutDeathYear
      }
      lives {
        tables {
          measure
          rows {
            century
            male {
              mean
              count
              filter
            }
            female {
              mean
              count
              filter
            }
            all {
              mean
              count
              filter
            }
          }
        }
        children {
          key
          count
          filter
        }
        meanChildren
        ageGaps {
          key
          count
          filter
        }
        meanAgeGap
      }
      firstNames {
        male {
          label
          count
          filter
        }
        female {
          label
          count
          filter
        }
        fashion {
          century
          male {
            label
            count
            filter
          }
          female {
            label
            count
            filter
          }
        }
      }
      migration {
        stayed
        moved
        moves {
          from
          to
          count
          filter
        }
        places {
          place
          persons
          firstYear
          lastYear
          filter
        }
        morePlaces
      }
      records {
        kind
        value
        ties
        possibleError
        persons {
          id
          title
          firstName
          middleName
          lastName
          birthName
        }
      }
      ancestors {
        person {
          id
          title
          firstName
          middleName
          lastName
          birthName
        }
        isHomePerson
        hasHomePerson
        found
        distinct
        generations {
          generation
          possible
          found
          distinct
          openEnds
          earliestBirth
          latestBirth
          filter
          openEndsFilter
        }
      }
    }
  }
`;

export const GET_STATISTICS_PERSONS = gql`
  ${PERSON_FIELDS}
  query GetStatisticsPersons($filter: String!, $scope: StatisticsScope) {
    statisticsPersons(filter: $filter, scope: $scope) {
      ...PersonFields
    }
  }
`;
