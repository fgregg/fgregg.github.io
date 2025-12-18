---
title: Salesforce is just a really weird web framework
author: Forest Gregg
layout: post 
description: The horrifying but ultimately admirable truth about what Salesforce really is.
tags: tech
---

In the past year, I had to work with Salesforce for the first time as a long-time web developer.

It took me a while to understand what it actually was as a piece of technology, and when I did understand, I was horrified.

Salesforce says that it is a CRM (or Customer Relationship Management software), but that means almost nothing. 

Salesforce comes default with some core "objects" like "Account" (a business-like thing) and "Contact" (a person-like thing). There are also default relationships set up between the core objects, so that you can represent that a particular contact works for some business. There are also pages set up so that you can see lists of these objects, see the details of a particular objects, and create new instances of objects.

These default settings presumably go some distance in helping capture the information that a sales team often wants when selling things to businesses.

However, that default functionality is not really what Salesforce is.

Here's the thing. You can create new types of objects or change the fields that exist on the existing core objects. You can define new relationships between objects. You can, within broad limits, decide what information appears on the listing and detail pages for objects.

If you are web developer, then this is just a variation of MVC. Where objects are Models, pages are Views, and the Controller logic is smeared around different configuration locations.

What that means is that you can build web applications of arbitrary complexity within Salesforce, mainly through their web interface. 

A web application of abitrary complexity that's not really under version control, and which is not really fully testable, and which is really only works within single, proprietary environment. Yikes!

On the other hand, it's serverless. Also, most of the security issues are SalesForce's problems not yours. 

Politically, Salesforce has other advantages. For organizations, building the web application in SalesForce often only requires the unit to get authorization for purchasing a single service, whereas as building the application in a normal programming language and deployed to normal servers would require the coordination and collaboratinog with the IT department. Additionaly, the the build within Salesforce can sometimes be characterized as OpEx instead of CapEx, which can sometimes be helpful.

So Salesforce is a way of building web applications without fully acknowledging that's waht you are doing. It's an impressive technical achievement.




