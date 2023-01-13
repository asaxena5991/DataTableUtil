@isTest
public class GenericSearchRecordsComponentCntrl_Test{

    @testSetup
    public static void createTestData(){
        Account acc = new Account(Name = 'Test', Clarify_Site_ID__c = '123456', Business_Unit__c = 'GMBU', 
                                  Industry='Associations', Status__c= 'Active', Type = 'Prospect', Physical_Country__c = 'USA',
                                  Physical_State_Province__c='AK', Account_Timezone__c ='(GMT-09:00) Alaska', ShippingCountry = 'USA',
                                  ShippingStreet= 'Test Street', ShippingCity ='Test City', ShippingState ='AK', 
                                  ShippingPostalCode = '123456', Same_as_Physical_address__c = true ,Company_Code__c='0010');
        insert acc;
        Case objCase = new case();
        objCase.AccountId = acc.Id;
        objCase.status='New';
        objCase.Subject = 'Test Case';
        insert objCase;
    }
    
    @isTest
    public static void testGetRecentlyViewed(){
        GenericSearchRecordsComponentCntrl.getRecentlyViewed('Case',new List<String>{'CaseNumber'},'');
        
        string staticCondition = '(RecordType.Name = \'Customer Support\')';
        GenericSearchRecordsComponentCntrl.getRecentlyViewed('Case',new List<String>{'CaseNumber'},staticCondition);
    }
    
    @isTest
    public static void testGetRecentlyViewedKnowledge(){
        GenericSearchRecordsComponentCntrl.getRecentlyViewed('KnowledgeArticleVersion',new List<String>{'Title'},'');
                
    }
    
    @isTest
    public static void testSearchRecords(){
        GenericSearchRecordsComponentCntrl.searchRecords('Case',new List<String>{'Subject'},new List<String>{'CaseNumber'},'Test','');
        
        string staticCondition = '(RecordType.Name = \'Customer Support\')';
        GenericSearchRecordsComponentCntrl.searchRecords('Case',new List<String>{'Subject'},new List<String>{'CaseNumber'},'Test',staticCondition);
    }
}