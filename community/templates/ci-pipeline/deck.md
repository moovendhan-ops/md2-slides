<!-- layout: custom:ci-pipeline -->
^ main · #1284
# Pipeline: deploy blocked at e2e
:::flow
- check-circle | install | 22s
- check-circle | lint | 14s
- check-circle | unit | 48s
- x-circle | e2e | 2 failed
- circle | deploy | queued
:::
