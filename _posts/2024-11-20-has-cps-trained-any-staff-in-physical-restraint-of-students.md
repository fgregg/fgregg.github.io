---
title: How many staff has CPS trained in physical restraint of students?
author: Forest Gregg
layout: post
date: 2024-11-20
description: Tracking whether Chicago Public Schools has certified enough staff in physical restraint of students, as ISBE requires.
reactive: true
---

```js
display(md`According to CPS’s [online database](https://www.cps.edu/about/policies/physical-restraint-time-out-resources/), **${trained_required.toLocaleString()} required staff** have completed their training in legal and safer methods of physically restraining students and have a non-expired certification as of today.*

There are at least **${remaining_schools.length} schools** that do not have enough certified staff.

CPS is under a corrective order from the Illinos State Board of Education (ISBE) to train any staff that might restrain a student.

Per [ISBE required staffing ratios](https://bunkum.us/CPS_PRTO_Trained_Staff_Ratio.pdf), CPS needs to train around ${total_required.toLocaleString()} employees. Out of that number, ${security_officers.toLocaleString()} are security officers; ${administrators.toLocaleString()} administrators; and ${staff.toLocaleString()} other staff. Of these groups, ${(certifications.filter(d => d.training_complete && d.expiration_date > due_date && d.class === 'security officer').length / security_officers).toLocaleString(undefined, { style: 'percent'})} of security officers have been trained; ${(d3.sum(nonfungible.map(d => Math.min(d.certified_admin, d.admin))) / administrators).toLocaleString(undefined, { style: 'percent'})} of administrators have been trained; and ${(d3.sum(nonfungible.map(d => Math.min(d.certified_other_staff, d.other_staff)))/ staff).toLocaleString(undefined, { style: 'percent'})} of other staff have been trained. CPS can choose to substitute additional trained staff for administrators.

\* Some schools have trained more than the required number of staff, so there a total of ${(certifications.filter(d => d.training_complete && d.expiration_date > due_date).length).toLocaleString()} staff with current certifications.`);
```

```js
display(md`## Reduced requirements
As the 2023-2024 school year neared, CPS claimed that ISBE only requires that each school has all security officers trained and two non-security staff trained. This is a substantially lower standard and would only require CPS to train ${(non_charters.length * 2 + security_officers).toLocaleString()} staff.

There are ${lower_trained_required.length} schools where all listed security officers have completed their training and their certifications have not expired as of today, and where at least two non-security staff will have valid certifications.

**${non_charters.length - lower_trained_required.length} schools** still do not meet this lower standard.`);
```

```js
display(md`## Further reduced requirements

After school started, CPS claimed that ISBE is only requiring them to train two staff, of any type, per school.
This would require training ${(non_charters.length * 2).toLocaleString()} staff.

Security staff, CPS seems to be claiming, do not need to trained.

${nonfungible.filter(
  (d) =>
    d.certified_admin + d.certified_other_staff + d.certified_security > 1).length} schools meet this standard, and **${nonfungible.filter(
  (d) => d.certified_admin + d.certified_other_staff + d.certified_security < 2).length} school(s)** do not.`);
```

```js
display(
Plot.plot({
  y: { label: "total certified staff" },
  x: {
    domain: [
      new Date(new Date(due_date).setFullYear(due_date.getFullYear() - 1)),
      due_date
    ],
    label: "date"
  },
  marks: [
    Plot.ruleY([total_required], { stroke: "black", strokeDasharray: [2, 4] }),
    Plot.text([[due_date, total_required]], {
      text: (d) => "Required trained staff",
      dy: -7,
      dx: -60
    }),
    Plot.line(
      certifications
        .filter((d) => d.expiration_date && d.expiration_date > due_date)
        .sort((a, b) => a.expiration_date - b.expiration_date),
      Plot.binX(
        { y: "count", cumulative: true, interval: "day" },
        {
          x: (d) =>
            new Date(
              new Date(d.expiration_date).setFullYear(
                d.expiration_date.getFullYear() - 1
              )
            ),
          curve: "step-before",
          tip: true
        }
      )
    )
  ]
})
);
```

```js
const certifications = certifications_history
  .filter((d) => d.observedDate === last_observed)
  .map(({ certExpirationDate, observedDate, ...d }) => ({
    ...d,
    training_complete: certExpirationDate !== "In Progress",
    expiration_date:
      certExpirationDate !== "In Progress"
        ? new Date(
            new Date(certExpirationDate).setFullYear(
              new Date(certExpirationDate).getFullYear() + 1
            )
          )
        : null,
    class: d.position.includes("Principal")
      ? "administrator"
      : d.position.includes("Security Officer")
      ? "security officer"
      : "other"
  }));
```

```js
const certifications_history = d3.csv(
  "https://raw.githubusercontent.com/fgregg/restraint-certifications/main/certification_history.csv"
);
```

```js
const last_observed = d3.max(certifications_history.map((d) => d.observedDate));
```

```js
const profiles = (async () => {
  const response = await fetch(
    "https://corsproxy.bunkum.us/corsproxy/?apiurl=https://api.cps.edu/schoolprofile/CPS/AllSchoolProfiles"
  );
  return response.json();
})();
```

```js
const non_charters = [
  ...new Map(
    profiles
      .filter(
        (d) =>
          d.SchoolType !== "Charter" &&
          d.SchoolType !== "Contract" &&
          d.Network !== "Options" &&
          d.SchoolLongName !== "NEW BRONZEVILLE & ENGLEWOOD HS" &&
          d.SchoolLongName !== "New Bronzeville & Englewood HS" &&
          d.SchoolLongName !== "The Virtual Academy High School" &&
          d.SchoolLongName !== "The Virtual Academy Elementary School"
      )
      .map((d) => [d.SchoolID, d])
  ).values()
];
```

```js
const ratios = [
  { cutoff: 301, staff: 2 },
  { cutoff: 750, staff: 3 },
  { cutoff: 1000, staff: 4 },
  { cutoff: 1500, staff: 5 },
  { cutoff: 2000, staff: 6 },
  { cutoff: 2500, staff: 7 },
  { cutoff: 3000, staff: 8 },
  { cutoff: 3500, staff: 9 },
  { cutoff: 4000, staff: 10 },
  { cutoff: Infinity, staff: 11 }
];
```

```js
const staff = d3.sum(
  non_charters.map(
    (profile) =>
      ratios.find((level) => level.cutoff > profile.StudentCount).staff
  )
);
```

```js
const administrators = non_charters.length * 2;
```

```js
const security_officers = 1501;
```

```js
const total_required = staff + security_officers + administrators;
```

```js
const nonfungible = non_charters
  .map((profile) => [
    profile.SchoolID,
    ratios.find((level) => level.cutoff > profile.StudentCount).staff,
    2
  ])
  .map(([id, other_staff, admin]) => ({
    id,
    other_staff,
    admin,
    certified_other_staff: certifications.filter(
      (d) =>
        d.training_complete &&
        d.expiration_date > due_date &&
        d.school_id == id &&
        d.class === "other"
    ).length,
    certified_admin: certifications.filter(
      (d) =>
        d.training_complete &&
        d.expiration_date > due_date &&
        d.school_id == id &&
        d.class === "administrator"
    ).length,
    certified_security: certifications.filter(
      (d) =>
        d.training_complete &&
        d.expiration_date > due_date &&
        d.school_id == id &&
        d.class === "security officer"
    ).length,
    expired_security: certifications.filter(
      (d) =>
        (!d.training_complete || d.expiration_date < due_date) &&
        d.school_id == id &&
        d.class === "security officer"
    ).length
  }));
```

```js
const remaining_schools = nonfungible.filter(
  (d) =>
    d.admin + d.other_staff > d.certified_admin + d.certified_other_staff ||
    d.expired_security != 0
);
```

```js
const lower_trained_required = nonfungible.filter(
  (d) =>
    d.certified_admin + d.certified_other_staff > 1 && d.expired_security === 0
);
```

```js
const trained_required = d3.sum(
  nonfungible.map((d) =>
    Math.min(
      d.other_staff + d.admin,
      d.certified_other_staff + d.certified_admin
    )
  )
) +
  certifications.filter(
    (d) =>
      d.training_complete &&
      d.expiration_date > due_date &&
      d.class === "security officer"
  ).length;
```

```js
const due_date = view(Inputs.date({ label: "Date", value: new Date() }));
```

