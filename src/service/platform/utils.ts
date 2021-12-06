// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Genie
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>

type NInvokeReturn<ObjType, Method extends keyof ObjType, ArgTypes extends unknown[]> =
    ObjType[Method] extends (this : ObjType, ...args : [...ArgTypes, (err ?: Error|null) => void]) => void ? void :
    ObjType[Method] extends (this : ObjType, ...args : [...ArgTypes, (err : Error|null, res : infer ResType) => void]) => void ? ResType :
    ObjType[Method] extends (this : ObjType, ...args : [...ArgTypes, (err : Error|null, ...res : infer ResType) => void]) => void ? ResType :
    never;

export function ninvoke<ObjType, Method extends keyof ObjType, ArgTypes extends unknown[]>(obj : ObjType, method : Method, ...args : ArgTypes)
    : Promise<NInvokeReturn<ObjType, Method, ArgTypes>> {
    return new Promise((resolve, reject) => {
        (obj[method] as any)(...args, (err : Error|null, ...res : any) => {
            if (err)
                reject(err);
            else if (res.length === 1)
                resolve(res[0]);
            else if (res.length === 0)
                resolve(undefined as any);
            else
                resolve(res);
        });
    });
}
