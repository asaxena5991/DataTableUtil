public with sharing class GenericSearchRecordsComponentCntrl {
    
    @AuraEnabled
    public static ResultWrapper searchRecords(String objectApiName, List<String> fieldsToSearch, List<String> fieldsToDisplay, String keyword,String staticCondition) {
        objectApiName = String.isEmpty(objectApiName) ? '' : objectApiName.trim();
        keyword = String.isEmpty(keyword) ? '' : keyword.trim(); 
        if(String.isEmpty(objectApiName) || fieldsToSearch.isEmpty() || fieldsToDisplay.isEmpty() || String.isEmpty(keyword)) {
            return null;
        }

        //We cannot get a describe on KnowledgeArticleVersion
        if(objectApiName == 'KnowledgeArticleVersion'){
            objectApiName = 'Knowledge__kav';
        }

        //If Id field present in fields to Display remove it.
        List<String> fieldsToDisplayList = removeIdField(fieldsToDisplay);
        String queryString;
        String fields;
        String criteria;
        
        //prepare a string of fields to query
        fields = 'id,' + String.join(fieldsToDisplayList,',');
        //prepare query string
        queryString = 'SELECT ' + fields + ' FROM ' + objectApiName + ' WHERE ';
        //prepare where clause
        if(!String.isEmpty(staticCondition)){
            queryString += checkStaticCondition(staticCondition) + ' AND ';    
        }
        for(String searchField:fieldsToSearch){
            if(String.isEmpty(criteria)){
                criteria = '(' + searchField + ' LIKE ' + '\'%' + String.escapeSingleQuotes(keyword) + '%\'';
            } else{
                criteria += ' OR ' + searchField + ' LIKE ' + '\'%' + String.escapeSingleQuotes(keyword) + '%\'';
            }
        }
        criteria += ')';
        //limit records to 100
        queryString += criteria + ' LIMIT 100';
        System.debug('QueryString: '+ queryString);
        List<Sobject> sobjectList = Database.query(queryString);
        
        List<String> fieldLabels = getFieldLables(objectApiName,fieldsToDisplayList);
        
        ResultWrapper output = new ResultWrapper();
        output.fieldLabels = fieldLabels;
        output.records = sobjectList;
        return output;
        
    }
    @AuraEnabled
    public static ResultWrapper getRecentlyViewed(String objectApiName, List<String> fieldsToDisplay,String staticCondition){
        objectApiName = String.isEmpty(objectApiName) ? '' : objectApiName.trim();
        if(String.isEmpty(objectApiName) || fieldsToDisplay.isEmpty()) {
            return null;
        }

        if(objectApiName == 'KnowledgeArticleVersion'){
            objectApiName = 'knowledge__kav';
            return getRecentKnowledgeArticles(objectApiName,fieldsToDisplay);
        }

        List<String> fieldsToDisplayList = removeIdField(fieldsToDisplay);
        
        String queryString;
        String fields;
        String criteria;
       
        fields = 'id,' + String.join(fieldsToDisplayList,',');
       
        queryString = 'SELECT ' + fields + ' FROM ' + objectApiName + ' WHERE ';
        
        if(!String.isEmpty(staticCondition)){
            queryString += checkStaticCondition(staticCondition) + ' AND ';    
        }
        
        criteria = 'LastViewedDate !=null ORDER BY LastViewedDate DESC'; 
        queryString += criteria + ' LIMIT 5';
        System.debug('QueryString: '+ queryString);
        List<Sobject> sobjectList = Database.query(queryString);
        
        List<String> fieldLabels = getFieldLables(objectApiName,fieldsToDisplayList);
        
        ResultWrapper output = new ResultWrapper();
        output.fieldLabels = fieldLabels;
        output.records = sobjectList;
        return output;
    }
    
    private static List<String> removeIdField(List<String> fieldsToDisplay){
        //If Id field present in fields to Display remove it.
        List<String> fieldsToDisplayList = new List<String>();
        for(String field:fieldsToDisplay){
            if(!field.equalsIgnoreCase('id')){
                fieldsToDisplayList.add(field);    
            }
        }
        return fieldsToDisplayList;
    }
    
    private static List<String> getFieldLables(String objectApiName,List<String> fieldsToDisplayList){
        SObjectType objectType = Schema.getGlobalDescribe().get(objectApiName);
        Map<String,Schema.SObjectField> mfields = objectType.getDescribe().fields.getMap();
        List<String> fieldLabels = new List<String>();
        for(String field:fieldsToDisplayList){
            fieldLabels.add(mfields.get(field).getDescribe().getLabel());    
        }
        return fieldLabels;
    }

    private static ResultWrapper getRecentKnowledgeArticles(String objectApiName, List<String> fieldsToDisplay){
        List<Knowledge__ka> kaList = [SELECT id 
                                      FROM Knowledge__ka
                                      ORDER BY LastViewedDate DESC NULLS LAST LIMIT 5];
        
        ResultWrapper output = new ResultWrapper();
        if(!kaList.isEmpty()){
            List<String> fieldsToDisplayList = removeIdField(fieldsToDisplay);
            
            String queryString;
            String fields;
            String criteria;
            
            fields = 'id,' + String.join(fieldsToDisplayList,',');
            
            queryString = 'SELECT ' + fields + ' FROM ' + objectApiName + ' WHERE ';
            
            criteria = 'knowledgeArticleID IN :kaList AND PublishStatus  = \'Online\' AND RecordType.DeveloperName = \'RDO_Knowledge_Center\'';
            queryString += criteria;
            System.debug('QueryString: '+ queryString);
            List<Sobject> sobjectList = Database.query(queryString);
            
            List<String> fieldLabels = getFieldLables(objectApiName,fieldsToDisplayList);
            output.fieldLabels = fieldLabels;
            output.records = sobjectList;
        }
        return output;
    }

    private static string checkStaticCondition(String staticCondition){
        if(!staticCondition.startsWith('(')){
            staticCondition = '(' + staticCondition;
        }
        if(!staticCondition.endsWith(')')){
            staticCondition = staticCondition + ')';
        }
        return staticCondition;
    }
    
    public class ResultWrapper{
        @AuraEnabled
        public List<String> fieldLabels;
        @AuraEnabled
        public List<Sobject> records;
    }
}